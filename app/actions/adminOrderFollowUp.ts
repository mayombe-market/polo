'use server'

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createNotification } from '@/app/actions/notifications'
import { sendVendorReminderEmail } from '@/app/actions/emails'
import { sendPushToUsers } from '@/lib/pushServer'
import { assertAdminCanActOnOrder } from '@/lib/adminZoneServer'
import { formatOrderNumber } from '@/lib/formatOrderNumber'
import { formatDelay, isAwaitingVendor, minutesBetween } from '@/lib/vendorResponsiveness'

const REMINDER_COOLDOWN_MIN = 15

function svc() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
}

async function requireAdmin(): Promise<{ error: string } | { supabase: Awaited<ReturnType<typeof createServerClient>>; userId: string }> {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non connecté' }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return { error: 'Non autorisé' }
    return { supabase, userId: user.id }
}

function chunks<T>(arr: T[], size = 100): T[][] {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
}

export type ContactInfo = { name: string; email: string | null; phone: string | null; whatsapp: string | null }

export type OrdersContext = {
    vendors: Record<string, ContactInfo & { shopName: string }>
    buyers: Record<string, ContactInfo>
    ratedAt: Record<string, string>
    reminders: Record<string, Array<{ at: string; vendorId: string }>>
}

/** Coordonnées vendeurs / clients, avis et relances pour les commandes affichées dans l'admin. */
export async function adminGetOrdersContext(input: {
    vendorIds: string[]
    buyerIds: string[]
    orderIds: string[]
}): Promise<OrdersContext | { error: string }> {
    const auth = await requireAdmin()
    if ('error' in auth) return { error: auth.error }
    const db = svc()
    const uniq = (a: string[]) => [...new Set(a.filter(Boolean))]
    const ctx: OrdersContext = { vendors: {}, buyers: {}, ratedAt: {}, reminders: {} }

    const profileIds = uniq([...input.vendorIds, ...input.buyerIds])
    for (const ids of chunks(profileIds)) {
        const { data } = await db
            .from('profiles')
            .select('id, shop_name, store_name, full_name, email, phone, whatsapp_number')
            .in('id', ids)
        for (const p of data || []) {
            const contact = {
                name: p.full_name || p.shop_name || 'Sans nom',
                email: p.email || null,
                phone: p.phone || null,
                whatsapp: p.whatsapp_number || null,
            }
            if (input.vendorIds.includes(p.id)) ctx.vendors[p.id] = { ...contact, shopName: p.shop_name || p.store_name || contact.name }
            if (input.buyerIds.includes(p.id)) ctx.buyers[p.id] = contact
        }
    }

    for (const ids of chunks(uniq(input.orderIds))) {
        const { data } = await db.from('ratings').select('order_id, created_at').in('order_id', ids)
        for (const r of data || []) ctx.ratedAt[r.order_id] = r.created_at
    }

    const orderSet = new Set(input.orderIds)
    const { data: reminders } = await db
        .from('notifications')
        .select('created_at, user_id, reference_id')
        .eq('type', 'order_reminder')
        .gte('created_at', new Date(Date.now() - 120 * 24 * 3600_000).toISOString())
        .limit(2000)
    for (const r of reminders || []) {
        const orderId = String(r.reference_id || '').split(':')[0]
        if (!orderSet.has(orderId)) continue
        ;(ctx.reminders[orderId] ??= []).push({ at: r.created_at, vendorId: r.user_id })
    }
    return ctx
}

/** Relance un vendeur qui n'a pas encore répondu : email + notification + push. */
export async function adminRemindVendor(orderId: string, vendorId: string): Promise<
    { success: true; sentAt: string; emailed: boolean } | { error: string }
> {
    const auth = await requireAdmin()
    if ('error' in auth) return { error: auth.error }
    const zone = await assertAdminCanActOnOrder(auth.supabase, auth.userId, orderId)
    if (zone.error) return { error: zone.error }

    const db = svc()
    const { data: order } = await db
        .from('orders')
        .select('id, order_number, created_at, status, order_type, payment_method, customer_name, items, vendor_payments, cod_accepted_at')
        .eq('id', orderId)
        .single()
    if (!order) return { error: 'Commande introuvable' }
    const items = (order.items || []) as Array<{ name?: string; quantity?: number; price?: number; seller_id?: string }>
    if (!items.some(i => i.seller_id === vendorId)) return { error: 'Ce vendeur ne fait pas partie de la commande.' }
    if (!isAwaitingVendor(order, vendorId)) return { error: 'Ce vendeur a déjà répondu à cette commande.' }

    const { data: last } = await db
        .from('notifications')
        .select('created_at')
        .eq('type', 'order_reminder')
        .eq('user_id', vendorId)
        .like('reference_id', `${orderId}:%`)
        .order('created_at', { ascending: false })
        .limit(1)
    if (last?.[0] && minutesBetween(last[0].created_at, new Date().toISOString()) < REMINDER_COOLDOWN_MIN) {
        return { error: `Une relance a déjà été envoyée il y a moins de ${REMINDER_COOLDOWN_MIN} min.` }
    }

    const { data: vendor } = await db
        .from('profiles')
        .select('full_name, shop_name, email')
        .eq('id', vendorId)
        .single()

    const mine = items.filter(i => i.seller_id === vendorId)
    const productNames = mine.map(i => `${i.name || 'Article'}${(i.quantity ?? 1) > 1 ? ` ×${i.quantity}` : ''}`).join(', ')
    const entry = (order.vendor_payments || {})[vendorId] as { amount?: number; transaction_id?: string } | undefined
    const amount = entry?.amount ?? mine.reduce((s, i) => s + (i.price || 0) * (i.quantity ?? 1), 0)
    const delayLabel = formatDelay(minutesBetween(order.created_at, new Date().toISOString()))
    const orderNumber = formatOrderNumber(order)
    const sentAt = new Date().toISOString()

    const title = `⏰ Commande en attente depuis ${delayLabel}`
    const body = `${order.customer_name || 'Un client'} attend votre réponse pour ${productNames}.`
    const link = '/vendor/dashboard?tab=orders'

    let emailed = false
    if (vendor?.email) {
        const res = await sendVendorReminderEmail(vendor.email, {
            vendorName: vendor.full_name || vendor.shop_name || '',
            shopName: vendor.shop_name || vendor.full_name || 'Votre boutique',
            orderNumber,
            customerName: order.customer_name || 'Client',
            productNames,
            amount,
            method: order.payment_method || '',
            delayLabel,
            transactionId: entry?.transaction_id || null,
        })
        emailed = 'success' in res
    }
    await Promise.allSettled([
        createNotification(vendorId, 'order_reminder', title, body, link, `${orderId}:${vendorId}:${sentAt}`),
        sendPushToUsers([vendorId], title, body, link),
    ])
    return { success: true, sentAt, emailed }
}
