'use server'

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

// ─── Motifs prédéfinis ─────────────────────────────────────────
export { DISPUTE_MOTIFS } from '@/lib/disputeMotifs'

// ─── Client : créer un litige ──────────────────────────────────
export async function createDispute({
    orderId,
    motif,
    description,
    images,
}: {
    orderId: string
    motif: string
    description?: string
    images?: string[]
}) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non connecté' }

    // Vérifier que la commande appartient à l'utilisateur et est livrée
    const { data: order } = await supabase
        .from('orders')
        .select('id, status, seller_id, customer_name, items, total_amount')
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single()

    if (!order) return { error: 'Commande introuvable' }
    if (!['delivered', 'confirmed', 'processing', 'shipped', 'picked_up'].includes(order.status)) {
        return { error: 'Vous ne pouvez pas ouvrir un litige sur cette commande' }
    }

    // Vérifier qu'il n'y a pas déjà un litige ouvert
    const { data: existing } = await supabase
        .from('disputes')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle()

    if (existing) return { error: 'Un litige existe déjà pour cette commande' }

    const { data, error } = await svc()
        .from('disputes')
        .insert({
            order_id: orderId,
            user_id: user.id,
            seller_id: order.seller_id,
            motif,
            description: description || null,
            images: images || [],
            status: 'pending',
        })
        .select()
        .single()

    if (error) return { error: error.message }
    return { success: true, dispute: data }
}

// ─── Client : voir ses litiges ─────────────────────────────────
export async function getMyDisputes() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [] }

    const { data } = await supabase
        .from('disputes')
        .select('*, orders(id, items, total_amount, created_at)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    return { data: data || [] }
}

// ─── Client : vérifier si une commande a déjà un litige ───────
export async function getDisputeByOrder(orderId: string) {
    const supabase = await getSupabase()
    const { data } = await supabase
        .from('disputes')
        .select('id, status, motif, created_at, admin_note')
        .eq('order_id', orderId)
        .maybeSingle()
    return { data }
}

// ─── Admin : voir tous les litiges ────────────────────────────
export async function adminGetDisputes({
    status,
    page = 0,
    perPage = 30,
}: {
    status?: string
    page?: number
    perPage?: number
} = {}) {
    let q = svc()
        .from('disputes')
        .select(`
            id, created_at, status, motif, description, images, admin_note, resolved_at,
            orders:order_id (id, total_amount, items, created_at, customer_name, customer_phone, customer_city),
            buyer:user_id (id, full_name, first_name, last_name, email, phone),
            seller:seller_id (id, shop_name, full_name, email, phone)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * perPage, (page + 1) * perPage - 1)

    if (status && status !== 'all') q = q.eq('status', status)

    const { data, error, count } = await q
    if (error) return { data: [], total: 0, error: error.message }
    return { data: data || [], total: count || 0 }
}

// ─── Admin : accepter un litige ───────────────────────────────
export async function adminAcceptDispute({
    disputeId,
    note,
    buyerEmail,
    buyerName,
}: {
    disputeId: string
    note?: string
    buyerEmail: string
    buyerName: string
}) {
    const { error } = await svc()
        .from('disputes')
        .update({
            status: 'accepted',
            admin_note: note || null,
            resolved_at: new Date().toISOString(),
        })
        .eq('id', disputeId)

    if (error) return { error: error.message }

    // Envoyer email automatique au client
    const { sendDisputeAcceptedEmail } = await import('@/app/actions/emails')
    await sendDisputeAcceptedEmail({ buyerEmail, buyerName, note })

    return { success: true }
}

// ─── Admin : rejeter un litige ────────────────────────────────
export async function adminRejectDispute({
    disputeId,
    note,
    buyerEmail,
    buyerName,
}: {
    disputeId: string
    note?: string
    buyerEmail: string
    buyerName: string
}) {
    const { error } = await svc()
        .from('disputes')
        .update({
            status: 'rejected',
            admin_note: note || null,
            resolved_at: new Date().toISOString(),
        })
        .eq('id', disputeId)

    if (error) return { error: error.message }

    // Envoyer email de notification au client
    const { sendDisputeRejectedEmail } = await import('@/app/actions/emails')
    await sendDisputeRejectedEmail({ buyerEmail, buyerName, note })

    return { success: true }
}
