'use server'

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { applyVendorPaymentDecision, type VendorDecisionResult } from '@/lib/orderNotifyServer'

function svc() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

async function getSupabase() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
}

// ─── Validation numéro Congo ──────────────────────────────────────────────────
function normalizeCongoPhone(raw: string): string | null {
    const digits = raw.replace(/\D/g, '')
    // Accepter : 06XXXXXXX (9 chiffres) ou 2420XXXXXXX / 242XXXXXXXXX
    if (digits.length === 9 && (digits.startsWith('06') || digits.startsWith('05') || digits.startsWith('04'))) {
        return digits
    }
    if (digits.length === 11 && digits.startsWith('2420')) return digits.slice(3) // 2420X → 0X
    if (digits.length === 12 && digits.startsWith('242')) {
        const local = digits.slice(3)
        if (local.startsWith('0')) return local
    }
    return null
}

// Formatage affichage : "064956279" → "06 495 62 79"
function formatPhoneDisplay(digits: string): string {
    const d = digits.replace(/\D/g, '')
    if (d.length === 9) return `${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5,7)} ${d.slice(7,9)}`
    return d
}

// ─── Vendeur : mettre à jour ses numéros de paiement + options livraison ────
export async function updateVendorPaymentInfo(input: {
    mtn_momo_number?: string | null
    airtel_money_number?: string | null
    payment_holder_name?: string | null
    vendor_delivery_fee?: number | null
    vendor_pickup_address?: string | null
    accept_cod?: boolean | null
    accept_pickup_payment?: boolean | null
    cod_reservation_hours?: number | null
}): Promise<{ success: true } | { error: string }> {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non connecté' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    if (profile?.role !== 'vendor') return { error: 'Accès réservé aux vendeurs' }

    const update: Record<string, string | null> = {}

    if (input.mtn_momo_number !== undefined) {
        if (input.mtn_momo_number === null || input.mtn_momo_number.trim() === '') {
            update.mtn_momo_number = null
        } else {
            const normalized = normalizeCongoPhone(input.mtn_momo_number)
            if (!normalized) return { error: 'Numéro MTN MoMo invalide (format : 06 XXX XX XX)' }
            update.mtn_momo_number = normalized
        }
    }

    if (input.airtel_money_number !== undefined) {
        if (input.airtel_money_number === null || input.airtel_money_number.trim() === '') {
            update.airtel_money_number = null
        } else {
            const normalized = normalizeCongoPhone(input.airtel_money_number)
            if (!normalized) return { error: 'Numéro Airtel Money invalide (format : 05 XXX XX XX)' }
            update.airtel_money_number = normalized
        }
    }

    if (input.payment_holder_name !== undefined) {
        const name = input.payment_holder_name?.trim() || null
        if (name && name.length > 80) return { error: 'Nom du titulaire trop long (max 80 caractères)' }
        update.payment_holder_name = name
    }

    if (input.vendor_delivery_fee !== undefined) {
        if (input.vendor_delivery_fee === null) {
            (update as any).vendor_delivery_fee = null
        } else {
            const fee = Number(input.vendor_delivery_fee)
            if (!Number.isInteger(fee) || fee < 0 || fee > 50000) {
                return { error: 'Frais de livraison invalides (0 – 50 000 FCFA)' }
            }
            ;(update as any).vendor_delivery_fee = fee
        }
    }

    if (input.vendor_pickup_address !== undefined) {
        const addr = input.vendor_pickup_address?.trim() || null
        if (addr && addr.length > 200) return { error: 'Adresse de retrait trop longue (max 200 caractères)' }
        ;(update as any).vendor_pickup_address = addr
    }

    if (input.accept_cod !== undefined) {
        ;(update as any).accept_cod = input.accept_cod === null ? true : Boolean(input.accept_cod)
    }

    if (input.accept_pickup_payment !== undefined) {
        ;(update as any).accept_pickup_payment = input.accept_pickup_payment === null ? true : Boolean(input.accept_pickup_payment)
    }

    if (input.cod_reservation_hours !== undefined && input.cod_reservation_hours !== null) {
        const hours = Number(input.cod_reservation_hours)
        if (!Number.isInteger(hours) || hours < 1 || hours > 168) {
            return { error: 'Durée de réservation invalide (1 – 168 heures)' }
        }
        ;(update as any).cod_reservation_hours = hours
    }

    if (Object.keys(update).length === 0) return { success: true }

    const { error } = await svc()
        .from('profiles')
        .update(update)
        .eq('id', user.id)

    if (error) return { error: error.message }
    return { success: true }
}

// ─── Vendeur : récupérer ses infos de paiement + livraison ──────────────────
export async function getVendorPaymentInfo(): Promise<{
    mtn_momo_number: string | null
    airtel_money_number: string | null
    payment_holder_name: string | null
    mtn_display: string | null
    airtel_display: string | null
    vendor_delivery_fee: number | null
    vendor_pickup_address: string | null
    accept_cod: boolean
    accept_pickup_payment: boolean
    cod_reservation_hours: number
} | { error: string }> {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non connecté' }

    const { data, error } = await supabase
        .from('profiles')
        .select('mtn_momo_number, airtel_money_number, payment_holder_name, vendor_delivery_fee, vendor_pickup_address, accept_cod, accept_pickup_payment, cod_reservation_hours')
        .eq('id', user.id)
        .single()

    if (error) return { error: error.message }

    return {
        mtn_momo_number: data?.mtn_momo_number ?? null,
        airtel_money_number: data?.airtel_money_number ?? null,
        payment_holder_name: data?.payment_holder_name ?? null,
        mtn_display: data?.mtn_momo_number ? formatPhoneDisplay(data.mtn_momo_number) : null,
        airtel_display: data?.airtel_money_number ? formatPhoneDisplay(data.airtel_money_number) : null,
        vendor_delivery_fee: data?.vendor_delivery_fee ?? null,
        vendor_pickup_address: data?.vendor_pickup_address ?? null,
        accept_cod: data?.accept_cod ?? true,
        accept_pickup_payment: data?.accept_pickup_payment ?? true,
        cod_reservation_hours: data?.cod_reservation_hours ?? 24,
    }
}

// ─── Vendeur : commandes avec paiement en attente de confirmation ─────────────
export async function getVendorPendingPayments(): Promise<{
    orders: Array<{
        order_id: string
        order_number: number | null
        created_at: string
        customer_name: string
        items: string
        method: string
        vendor_number: string
        holder_name: string
        transaction_id: string
        amount: number
        vendor_confirmed: boolean
        disputed: boolean
    }>
} | { error: string }> {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non connecté' }

    // Commandes avec un vendor_payments non vide pour ce vendeur, statut pending
    const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_number, created_at, customer_name, status, vendor_payments, items')
        .eq('status', 'pending')
        .not('vendor_payments', 'eq', '{}')
        .order('created_at', { ascending: false })
        .limit(50)

    if (error) return { error: error.message }

    const result = []
    for (const order of orders || []) {
        const vp = order.vendor_payments as Record<string, any>
        if (!vp || !vp[user.id]) continue
        const entry = vp[user.id]
        if (!entry.transaction_id) continue // le client n'a pas encore saisi la référence

        const myItems = (order.items || [])
            .filter((i: any) => i.seller_id === user.id)
            .map((i: any) => `${i.name} ×${i.quantity}`)
            .join(', ')

        result.push({
            order_id: order.id,
            order_number: order.order_number ?? null,
            created_at: order.created_at,
            customer_name: order.customer_name || 'Client',
            items: myItems,
            method: entry.method,
            vendor_number: entry.vendor_number || '',
            holder_name: entry.holder_name || '',
            transaction_id: entry.transaction_id || '',
            amount: entry.amount || 0,
            vendor_confirmed: entry.vendor_confirmed || false,
            disputed: entry.disputed || false,
        })
    }

    return { orders: result }
}

// ─── Vendeur : confirmer ou refuser la réception d'un paiement ───────────────
// Reçu → la commande est confirmée (dès que tous les vendeurs du panier ont validé).
// Non reçu → la commande est annulée et le stock restauré.
export async function vendorConfirmPayment(
    orderId: string,
    confirmed: boolean
): Promise<VendorDecisionResult> {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non connecté' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    if (profile?.role !== 'vendor') return { error: 'Réservé aux vendeurs' }

    const result = await applyVendorPaymentDecision(orderId, user.id, confirmed, task => {
        after(() => task().catch(err => console.error('[vendorConfirmPayment] notifications:', err)))
    })

    if ('success' in result) {
        revalidatePath('/vendor/dashboard')
        revalidatePath('/admin/orders')
    }
    return result
}

// ─── Lecture publique des numéros vendeur + options livraison (pour le checkout) ─
// Retourne uniquement les champs nécessaires, pas les données sensibles.
export async function getVendorPaymentNumbers(sellerIds: string[]): Promise<
    Record<string, {
        mtn: string | null
        airtel: string | null
        holder: string | null
        whatsapp: string | null
        shop_name: string | null
        vendor_delivery_fee: number | null
        vendor_pickup_address: string | null
        accept_cod: boolean
        accept_pickup_payment: boolean
        cod_reservation_hours: number
    }>
> {
    if (!sellerIds || sellerIds.length === 0) return {}

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data } = await supabase
        .from('profiles')
        .select('id, mtn_momo_number, airtel_money_number, payment_holder_name, whatsapp_number, shop_name, vendor_delivery_fee, vendor_pickup_address, accept_cod, accept_pickup_payment, cod_reservation_hours')
        .in('id', sellerIds)

    const result: Record<string, {
        mtn: string | null; airtel: string | null; holder: string | null; whatsapp: string | null; shop_name: string | null
        vendor_delivery_fee: number | null; vendor_pickup_address: string | null
        accept_cod: boolean; accept_pickup_payment: boolean; cod_reservation_hours: number
    }> = {}
    for (const row of data || []) {
        result[row.id] = {
            mtn: row.mtn_momo_number ? formatPhoneDisplay(row.mtn_momo_number) : null,
            airtel: row.airtel_money_number ? formatPhoneDisplay(row.airtel_money_number) : null,
            holder: row.payment_holder_name || null,
            whatsapp: row.whatsapp_number || null,
            shop_name: row.shop_name || null,
            vendor_delivery_fee: row.vendor_delivery_fee ?? null,
            vendor_pickup_address: row.vendor_pickup_address || null,
            accept_cod: row.accept_cod ?? true,
            accept_pickup_payment: row.accept_pickup_payment ?? true,
            cod_reservation_hours: row.cod_reservation_hours ?? 24,
        }
    }
    return result
}
