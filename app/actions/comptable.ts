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

async function getSupabaseUser() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    return supabase
}

// ════════════════════════════════════════════════════════
// GESTION RÔLE COMPTABLE
// ════════════════════════════════════════════════════════
export async function promoteToComptable(userId: string) {
    const supabase = await getSupabaseUser()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non connecté' }

    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') return { error: 'Non autorisé' }

    const { data: target } = await svc().from('profiles').select('role').eq('id', userId).single()
    if (!target) return { error: 'Utilisateur introuvable' }
    if (target.role === 'admin') return { error: 'Impossible de modifier un admin' }
    if (target.role === 'comptable') return { error: 'Déjà comptable' }

    const { error } = await svc().from('profiles').update({ role: 'comptable' }).eq('id', userId)
    if (error) return { error: error.message }
    return { success: true }
}

export async function demoteComptable(userId: string) {
    const supabase = await getSupabaseUser()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non connecté' }

    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') return { error: 'Non autorisé' }

    const { data: target } = await svc().from('profiles').select('role').eq('id', userId).single()
    if (!target) return { error: 'Utilisateur introuvable' }
    if (target.role !== 'comptable') return { error: "Cet utilisateur n'est pas comptable" }

    const { error } = await svc().from('profiles').update({ role: 'user' }).eq('id', userId)
    if (error) return { error: error.message }
    return { success: true }
}

export async function getComptables() {
    const { data, error } = await svc()
        .from('profiles')
        .select('id, full_name, first_name, last_name, email, phone, avatar_url, created_at')
        .eq('role', 'comptable')
        .order('created_at', { ascending: false })
    if (error) return { error: error.message }
    return { data: data || [] }
}

export async function searchUsersForPromotion(query: string) {
    const service = svc()
    if (query.length < 2) {
        const { data } = await service.from('profiles')
            .select('id, full_name, first_name, last_name, phone, email, role')
            .in('role', ['user', 'buyer', 'vendor'])
            .order('created_at', { ascending: false })
            .limit(20)
        return { users: data || [] }
    }
    const q = query.replace(/[%_\\]/g, '\\$&')
    const { data } = await service.from('profiles')
        .select('id, full_name, first_name, last_name, phone, email, role')
        .or(`full_name.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
        .not('role', 'in', '("admin","comptable","logistician")')
        .limit(20)
    return { users: data || [] }
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

// ─── Utilitaires dates ───────────────────────────────────
function startOfMonth(d = new Date()) {
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}
function startOfYear(d = new Date()) {
    return new Date(d.getFullYear(), 0, 1).toISOString()
}

// ════════════════════════════════════════════════════════
// DASHBOARD FINANCIER
// Tous les KPIs de la comptable d'un seul appel
// ════════════════════════════════════════════════════════
export async function getFinancialDashboard() {
    const supabase = svc()
    const monthStart = startOfMonth()
    const yearStart  = startOfYear()
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

    const [
        commissionsMonth,
        commissionsYear,
        pendingPayouts,
        latePayouts,
        subsMonth,
        subsYear,
        recentPaidPayouts,
        bankTransfers,
    ] = await Promise.all([
        // Commissions plateforme ce mois (commandes normales)
        supabase.from('orders').select('commission_amount')
            .gte('created_at', monthStart).neq('status', 'rejected').neq('order_type', 'subscription'),

        // Commissions cette année
        supabase.from('orders').select('commission_amount')
            .gte('created_at', yearStart).neq('status', 'rejected').neq('order_type', 'subscription'),

        // Payouts en attente
        supabase.from('orders')
            .select('id, vendor_payout, total_amount, created_at, items, profiles:seller_id(shop_name, full_name)')
            .eq('status', 'delivered').eq('payout_status', 'pending').neq('order_type', 'subscription')
            .order('created_at', { ascending: true }),

        // Payouts en retard (> 7 jours)
        supabase.from('orders').select('id', { count: 'exact', head: true })
            .eq('status', 'delivered').eq('payout_status', 'pending')
            .lte('created_at', sevenDaysAgo),

        // Revenus abonnements ce mois
        supabase.from('orders').select('total_amount, items')
            .eq('order_type', 'subscription').neq('status', 'rejected')
            .gte('created_at', monthStart),

        // Revenus abonnements cette année
        supabase.from('orders').select('total_amount')
            .eq('order_type', 'subscription').neq('status', 'rejected')
            .gte('created_at', yearStart),

        // 5 derniers payouts effectués
        supabase.from('orders')
            .select('id, vendor_payout, payout_date, payout_reference, profiles:seller_id(shop_name)')
            .eq('payout_status', 'paid').neq('order_type', 'subscription')
            .not('payout_date', 'is', null)
            .order('payout_date', { ascending: false }).limit(5),

        // Solde virements banque ce mois
        supabase.from('bank_transfers').select('amount').gte('created_at', monthStart),
    ])

    const totalCommissionsMonth = (commissionsMonth.data || []).reduce((s, o) => s + (o.commission_amount || 0), 0)
    const totalCommissionsYear  = (commissionsYear.data  || []).reduce((s, o) => s + (o.commission_amount || 0), 0)
    const totalPendingAmount    = (pendingPayouts.data   || []).reduce((s, o) => s + (o.vendor_payout || Math.round((o.total_amount || 0) * 0.9)), 0)
    const totalSubsMonth        = (subsMonth.data        || []).reduce((s, o) => s + (o.total_amount || 0), 0)
    const totalSubsYear         = (subsYear.data         || []).reduce((s, o) => s + (o.total_amount || 0), 0)
    const totalBankMonth        = (bankTransfers.data    || []).reduce((s, t) => s + (t.amount || 0), 0)

    // Répartition abonnements ce mois par type
    const subBreakdown = (subsMonth.data || []).reduce((acc: Record<string, number>, o) => {
        const plan = (o.items?.[0]?.name || 'Autre').toLowerCase()
        const type = plan.includes('hotel') ? 'Hôtel'
                   : plan.includes('immo')  ? 'Immo'
                   : 'Marketplace'
        acc[type] = (acc[type] || 0) + (o.total_amount || 0)
        return acc
    }, {})

    return {
        commissions: {
            month: totalCommissionsMonth,
            year: totalCommissionsYear,
        },
        payouts: {
            pendingCount: (pendingPayouts.data || []).length,
            pendingAmount: totalPendingAmount,
            lateCount: latePayouts.count || 0,
            recentPaid: recentPaidPayouts.data || [],
        },
        subscriptions: {
            month: totalSubsMonth,
            year: totalSubsYear,
            breakdown: subBreakdown,
        },
        revenue: {
            // Ce que la plateforme a vraiment gagné ce mois = commissions + abonnements
            month: totalCommissionsMonth + totalSubsMonth,
            year:  totalCommissionsYear  + totalSubsYear,
        },
        bankTransfers: {
            month: totalBankMonth,
        },
    }
}

// ════════════════════════════════════════════════════════
// PAYOUTS VENDEURS
// ════════════════════════════════════════════════════════
export async function getPendingPayouts() {
    const { data, error } = await svc()
        .from('orders')
        .select(`
            id, created_at, total_amount, vendor_payout, commission_amount,
            items, customer_name, transaction_id, received_sim,
            payout_phone, payout_reference, payout_note,
            profiles:seller_id (id, shop_name, full_name, email, phone, payout_phone)
        `)
        .eq('status', 'delivered')
        .eq('payout_status', 'pending')
        .neq('order_type', 'subscription')
        .order('created_at', { ascending: true })

    if (error) return { error: error.message }
    return { data: data || [] }
}

export async function getPaidPayouts({ page = 0, perPage = 30 }: { page?: number; perPage?: number } = {}) {
    const from = page * perPage
    const { data, error, count } = await svc()
        .from('orders')
        .select(`
            id, created_at, total_amount, vendor_payout,
            payout_date, payout_reference, payout_phone, payout_note,
            profiles:seller_id (shop_name, full_name)
        `, { count: 'exact' })
        .eq('payout_status', 'paid')
        .neq('order_type', 'subscription')
        .not('payout_date', 'is', null)
        .order('payout_date', { ascending: false })
        .range(from, from + perPage - 1)

    if (error) return { error: error.message }
    return { data: data || [], total: count || 0 }
}

export async function markPayoutPaid({
    orderId,
    reference,
    phone,
    note,
}: {
    orderId: string
    reference: string
    phone: string
    note?: string
}) {
    const { error } = await svc()
        .from('orders')
        .update({
            payout_status: 'paid',
            payout_date: new Date().toISOString(),
            payout_reference: reference,
            payout_phone: phone,
            payout_note: note || null,
        })
        .eq('id', orderId)

    if (error) return { error: error.message }
    return { success: true }
}

// Sauvegarder le numéro MoMo du vendeur sur son profil
export async function saveVendorPayoutPhone(vendorId: string, phone: string) {
    const { error } = await svc()
        .from('profiles')
        .update({ payout_phone: phone })
        .eq('id', vendorId)
    if (error) return { error: error.message }
    return { success: true }
}

// ════════════════════════════════════════════════════════
// REVENUS ABONNEMENTS
// ════════════════════════════════════════════════════════
export async function getSubscriptionRevenue({
    startDate,
    endDate,
}: {
    startDate?: string
    endDate?: string
} = {}) {
    let q = svc()
        .from('orders')
        .select(`
            id, created_at, total_amount, transaction_id,
            items,
            profiles:seller_id (id, shop_name, full_name, vendor_type, subscription_plan)
        `)
        .eq('order_type', 'subscription')
        .neq('status', 'rejected')
        .order('created_at', { ascending: false })
        .limit(500)

    if (startDate) q = q.gte('created_at', startDate)
    if (endDate)   q = q.lte('created_at', endDate)

    const { data, error } = await q
    if (error) return { error: error.message }

    const rows = data || []

    // Grouper par mois
    const byMonth: Record<string, { total: number; count: number; rows: any[] }> = {}
    for (const r of rows) {
        const month = r.created_at.slice(0, 7) // "2026-04"
        if (!byMonth[month]) byMonth[month] = { total: 0, count: 0, rows: [] }
        byMonth[month].total += r.total_amount || 0
        byMonth[month].count++
        byMonth[month].rows.push(r)
    }

    return { data: rows, byMonth }
}

// ════════════════════════════════════════════════════════
// VIREMENTS BANQUE
// ════════════════════════════════════════════════════════
export async function getBankTransfers() {
    const { data, error } = await svc()
        .from('bank_transfers')
        .select('*, profiles:transferred_by(full_name)')
        .order('created_at', { ascending: false })
        .limit(100)

    if (error) return { error: error.message }
    return { data: data || [] }
}

export async function createBankTransfer({
    amount,
    simOperator,
    fromNumber,
    toBank,
    reference,
    note,
    userId,
}: {
    amount: number
    simOperator: 'mtn' | 'airtel' | 'autre'
    fromNumber?: string
    toBank: string
    reference?: string
    note?: string
    userId: string
}) {
    const { error } = await svc()
        .from('bank_transfers')
        .insert({
            amount,
            sim_operator: simOperator,
            from_number: fromNumber || null,
            to_bank: toBank,
            reference: reference || null,
            note: note || null,
            transferred_by: userId,
        })

    if (error) return { error: error.message }
    return { success: true }
}

// ════════════════════════════════════════════════════════
// EXPORT — données brutes pour CSV
// ════════════════════════════════════════════════════════
export async function getExportData({
    type,
    startDate,
    endDate,
}: {
    type: 'commandes' | 'abonnements' | 'payouts' | 'virements'
    startDate: string
    endDate: string
}) {
    const supabase = svc()

    if (type === 'commandes') {
        const { data } = await supabase.from('orders')
            .select('id, created_at, customer_name, customer_city, total_amount, commission_amount, vendor_payout, status, payment_method, payout_status, payout_date, payout_reference')
            .neq('order_type', 'subscription')
            .gte('created_at', startDate).lte('created_at', endDate)
            .order('created_at', { ascending: false })
        return { data: data || [] }
    }

    if (type === 'abonnements') {
        const { data } = await supabase.from('orders')
            .select('id, created_at, total_amount, transaction_id, items, profiles:seller_id(shop_name, email)')
            .eq('order_type', 'subscription').neq('status', 'rejected')
            .gte('created_at', startDate).lte('created_at', endDate)
            .order('created_at', { ascending: false })
        return { data: data || [] }
    }

    if (type === 'payouts') {
        const { data } = await supabase.from('orders')
            .select('id, created_at, vendor_payout, payout_status, payout_date, payout_reference, payout_phone, profiles:seller_id(shop_name, email)')
            .neq('order_type', 'subscription')
            .gte('created_at', startDate).lte('created_at', endDate)
            .order('created_at', { ascending: false })
        return { data: data || [] }
    }

    if (type === 'virements') {
        const { data } = await supabase.from('bank_transfers')
            .select('*').gte('created_at', startDate).lte('created_at', endDate)
            .order('created_at', { ascending: false })
        return { data: data || [] }
    }

    return { data: [] }
}
