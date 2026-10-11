'use server'

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createNotification } from './notifications'
import { revalidatePath } from 'next/cache'

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

// ─── Vendeur : récupérer ses préférences COD ──────────────────────────────────
export async function getVendorCodSettings(): Promise<{
    accept_cod: boolean
    accept_pickup_payment: boolean
    cod_reservation_hours: number
} | { error: string }> {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non connecté' }

    const { data, error } = await supabase
        .from('profiles')
        .select('accept_cod, accept_pickup_payment, cod_reservation_hours')
        .eq('id', user.id)
        .single()

    if (error) return { error: error.message }

    return {
        accept_cod: data?.accept_cod ?? true,
        accept_pickup_payment: data?.accept_pickup_payment ?? true,
        cod_reservation_hours: data?.cod_reservation_hours ?? 24,
    }
}

// ─── Vendeur : mettre à jour ses préférences COD ──────────────────────────────
export async function updateVendorCodSettings(input: {
    accept_cod?: boolean
    accept_pickup_payment?: boolean
    cod_reservation_hours?: number
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

    const update: Record<string, boolean | number> = {}

    if (input.accept_cod !== undefined) update.accept_cod = Boolean(input.accept_cod)
    if (input.accept_pickup_payment !== undefined) update.accept_pickup_payment = Boolean(input.accept_pickup_payment)
    if (input.cod_reservation_hours !== undefined) {
        const hours = Number(input.cod_reservation_hours)
        if (!Number.isInteger(hours) || hours < 1 || hours > 168) {
            return { error: 'Durée de réservation invalide (1 – 168 heures)' }
        }
        update.cod_reservation_hours = hours
    }

    if (Object.keys(update).length === 0) return { success: true }

    const { error } = await svc()
        .from('profiles')
        .update(update)
        .eq('id', user.id)

    if (error) return { error: error.message }
    return { success: true }
}

// ─── Vendeur : accepter une commande COD ──────────────────────────────────────
export async function acceptCodOrder(orderId: string): Promise<{ success: true } | { error: string }> {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non connecté' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    if (profile?.role !== 'vendor') return { error: 'Accès réservé aux vendeurs' }

    const { data: accepted, error } = await svc().rpc('vendor_accept_cod_order', {
        p_order_id: orderId,
        p_vendor_id: user.id,
    })

    if (error) return { error: error.message }
    if (!accepted) return { error: 'Impossible d\'accepter : commande introuvable, déjà traitée, ou vous n\'avez pas d\'articles dans cette commande.' }

    // Récupérer la commande pour notifications
    const { data: order } = await supabase
        .from('orders')
        .select('user_id, items')
        .eq('id', orderId)
        .single()

    if (order?.user_id) {
        const itemNames = ((order.items || []) as Array<{ name?: string; seller_id?: string }>)
            .filter(i => i.seller_id === user.id)
            .map(i => i.name)
            .join(', ')

        createNotification(
            order.user_id,
            'order_confirmed',
            'Commande COD acceptée',
            `Votre commande ${itemNames} a été acceptée et est en cours de préparation.`,
            '/account/dashboard?tab=orders',
            `${orderId}:cod_accepted`
        ).catch(() => {})
    }

    revalidatePath('/vendor/dashboard')
    return { success: true }
}

// ─── Vendeur : rejeter une commande COD + restaurer le stock ──────────────────
export async function rejectCodOrder(orderId: string): Promise<{ success: true } | { error: string }> {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non connecté' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    if (profile?.role !== 'vendor') return { error: 'Accès réservé aux vendeurs' }

    // Vérifier que la commande existe, est pending/confirmed, et que le vendeur y a des articles
    const { data: order } = await supabase
        .from('orders')
        .select('status, user_id, items, payment_method')
        .eq('id', orderId)
        .single()

    if (!order) return { error: 'Commande introuvable' }
    if (!['pending', 'confirmed'].includes(order.status)) {
        return { error: `Impossible de rejeter une commande en statut "${order.status}"` }
    }

    const hasItems = (order.items || []).some((i: any) => i?.seller_id === user.id)
    if (!hasItems) return { error: 'Non autorisé : pas d\'articles de votre boutique dans cette commande' }

    // Rejeter
    const { error: rejectErr } = await svc()
        .from('orders')
        .update({ status: 'rejected' })
        .eq('id', orderId)

    if (rejectErr) return { error: rejectErr.message }

    // Restaurer le stock
    await svc().rpc('restore_order_stock', { p_order_id: orderId })

    // Notifier l'acheteur
    if (order.user_id) {
        createNotification(
            order.user_id,
            'order_rejected',
            'Commande refusée par le vendeur',
            'Le vendeur ne peut pas honorer votre commande à la livraison. Contactez-le ou passez une nouvelle commande.',
            '/account/dashboard?tab=orders',
            `${orderId}:cod_rejected`
        ).catch(() => {})
    }

    revalidatePath('/vendor/dashboard')
    return { success: true }
}

// ─── Vendeur/livreur : confirmer encaissement + livraison via code ─────────────
// Seul le vendeur ou un admin peut appeler cette fonction.
// Le client ne peut PAS confirmer lui-même (sécurité RLS + vérification rôle).

export async function collectCodCash(
    orderId: string,
    deliveryCode: string
): Promise<{ success: true } | { error: string }> {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non connecté' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'vendor' && profile?.role !== 'admin') {
        return { error: 'Non autorisé' }
    }

    // Vérifier que la commande est bien à livraison COD (cash)
    const { data: order } = await supabase
        .from('orders')
        .select('payment_method, status, items, user_id')
        .eq('id', orderId)
        .single()

    if (!order) return { error: 'Commande introuvable' }
    if (order.payment_method !== 'cash') return { error: 'Cette commande n\'est pas un paiement à la livraison' }
    if (!['confirmed', 'shipped'].includes(order.status)) {
        return { error: `Statut invalide pour l'encaissement : "${order.status}"` }
    }

    // Vérification rôle vendor : doit avoir des articles dans la commande
    if (profile?.role === 'vendor') {
        const hasItems = (order.items || []).some((i: any) => i?.seller_id === user.id)
        if (!hasItems) return { error: 'Non autorisé : pas d\'articles de votre boutique' }
    }

    // Vérifier et consommer le code (SECURITY DEFINER — client ne peut pas l'appeler)
    const { data: codeOk, error: rpcErr } = await svc().rpc('consume_delivery_code', {
        p_order_id: orderId,
        p_code: deliveryCode.trim().toUpperCase(),
    })

    if (rpcErr) return { error: rpcErr.message }
    if (!codeOk) return { error: 'Code de livraison incorrect ou déjà utilisé.' }

    // Mettre à jour le statut à "delivered"
    await svc()
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', orderId)

    // Notifier l'acheteur
    if (order.user_id) {
        createNotification(
            order.user_id,
            'order_delivered',
            'Commande livrée — Paiement encaissé',
            'Votre commande a été livrée et le paiement a bien été encaissé. Merci !',
            '/account/dashboard?tab=orders',
            `${orderId}:cod_collected`
        ).catch(() => {})
    }

    revalidatePath('/vendor/dashboard')
    return { success: true }
}
