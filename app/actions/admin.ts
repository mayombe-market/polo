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

/** Guard : vérifie que l'appelant est admin. */
async function requireAdmin(): Promise<{ error: string } | { userId: string }> {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non connecté' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') return { error: 'Non autorisé' }
    return { userId: user.id }
}

// ─── Vendeurs ───────────────────────────────────────────

/**
 * Supprime définitivement un vendeur :
 * 1. Supprime le compte dans auth.users (via service role)
 * 2. Le profil est supprimé en cascade (FK ON DELETE CASCADE)
 */
export async function adminDeleteVendor(vendorId: string): Promise<{ success: true } | { error: string }> {
    const auth = await requireAdmin()
    if ('error' in auth) return { error: auth.error }

    if (!vendorId) return { error: 'ID vendeur manquant' }

    // Vérifier que c'est bien un vendeur avant de supprimer
    const { data: profile, error: checkErr } = await svc()
        .from('profiles')
        .select('role, email, shop_name')
        .eq('id', vendorId)
        .single()

    if (checkErr || !profile) return { error: 'Vendeur introuvable' }
    if (profile.role !== 'vendor') return { error: 'Ce compte n\'est pas un vendeur' }

    // Supprimer le compte auth (cascade supprime le profil)
    const { error: deleteErr } = await svc().auth.admin.deleteUser(vendorId)
    if (deleteErr) return { error: deleteErr.message }

    return { success: true }
}

// ─── Reviews ────────────────────────────────────────────
export async function adminDeleteReview(reviewId: string) {
    const auth = await requireAdmin()
    if ('error' in auth) return { error: auth.error }
    const { error } = await svc().from('reviews').delete().eq('id', reviewId)
    if (error) return { error: error.message }
    return { success: true }
}

export async function adminGetAllReviews({
    page = 0,
    perPage = 30,
    filter = 'all',
    minRating = 0,
    search = '',
}: {
    page?: number
    perPage?: number
    filter?: 'all' | 'hotel' | 'marketplace' | 'immobilier'
    minRating?: number
    search?: string
}) {
    const auth = await requireAdmin()
    if ('error' in auth) return { error: auth.error }
    const supabase = svc()
    const from = page * perPage
    const to = from + perPage - 1

    let q = supabase
        .from('reviews')
        .select(`
            id, rating, content, user_name, user_avatar, created_at,
            hotel_reply, hotel_reply_at,
            products:product_id (
                id, name, category,
                listing_extras,
                profiles:seller_id (id, shop_name, vendor_type)
            )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

    if (minRating > 0) q = q.gte('rating', minRating)
    if (search) q = q.ilike('content', `%${search}%`)

    const { data, error, count } = await q
    if (error) return { error: error.message }

    // Filtrer par vendor_type côté JS (jointure profonde)
    let rows = data || []
    if (filter !== 'all') {
        rows = rows.filter((r: any) => {
            const vendorType = r.products?.profiles?.vendor_type
            if (filter === 'hotel') {
                return vendorType === 'hotel' ||
                    (r.products?.listing_extras as any)?.version === 'hotel_v1'
            }
            if (filter === 'immobilier') return vendorType === 'immobilier'
            if (filter === 'marketplace') return !vendorType || vendorType === 'marketplace'
            return true
        })
    }

    return { data: rows, total: count || 0 }
}

// ─── Activity feed ───────────────────────────────────────
export async function adminGetRecentActivity(limit = 80) {
    const auth = await requireAdmin()
    if ('error' in auth) return { data: [], error: auth.error }
    const supabase = svc()
    const cut = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 jours

    const [orders, vendors, products, reviews, verifs, hotelReqs] = await Promise.all([
        supabase.from('orders')
            .select('id, created_at, customer_name, total_amount, status, customer_city')
            .neq('order_type', 'subscription')
            .gte('created_at', cut)
            .order('created_at', { ascending: false })
            .limit(30),

        supabase.from('profiles')
            .select('id, created_at, full_name, email, shop_name, vendor_type, subscription_plan, role')
            .eq('role', 'vendor')
            .gte('created_at', cut)
            .order('created_at', { ascending: false })
            .limit(20),

        supabase.from('products')
            .select('id, created_at, name, category, price, seller_id, profiles:seller_id(shop_name)')
            .gte('created_at', cut)
            .order('created_at', { ascending: false })
            .limit(20),

        supabase.from('reviews')
            .select('id, created_at, user_name, rating, content, products:product_id(name)')
            .gte('created_at', cut)
            .order('created_at', { ascending: false })
            .limit(20),

        supabase.from('vendor_verifications')
            .select('id, created_at, status, profiles:vendor_id(full_name, shop_name)')
            .gte('created_at', cut)
            .order('created_at', { ascending: false })
            .limit(20),

        supabase.from('hotel_review_requests')
            .select('id, created_at, guest_email, status, profiles:hotel_id(shop_name), products:product_id(name)')
            .gte('created_at', cut)
            .order('created_at', { ascending: false })
            .limit(20),
    ])

    type ActivityItem = {
        id: string; type: string; title: string; subtitle: string
        created_at: string; link?: string; badge?: string; badgeColor?: string
    }

    const items: ActivityItem[] = []

    for (const o of orders.data || []) {
        items.push({
            id: `order-${o.id}`, type: 'order',
            title: `Commande — ${(o.total_amount || 0).toLocaleString('fr-FR')} F`,
            subtitle: `${o.customer_name || 'Client'} · ${o.customer_city || ''} · ${o.status}`,
            created_at: o.created_at,
            link: '/admin/orders',
            badge: o.status === 'pending' ? 'En attente' : o.status === 'delivered' ? 'Livrée' : o.status,
            badgeColor: o.status === 'pending' ? '#F59E0B' : o.status === 'delivered' ? '#22C55E' : '#64748B',
        })
    }

    for (const v of vendors.data || []) {
        const vt = v.vendor_type === 'hotel' ? '🏨 Hôtel' : v.vendor_type === 'immobilier' ? '🏠 Immo' : '🛍 Marketplace'
        items.push({
            id: `vendor-${v.id}`, type: 'vendor',
            title: `Nouveau vendeur — ${v.shop_name || v.full_name || v.email}`,
            subtitle: `${vt} · ${v.subscription_plan || 'free'}`,
            created_at: v.created_at,
            link: '/admin/vendors',
            badge: vt, badgeColor: v.vendor_type === 'hotel' ? '#F59E0B' : v.vendor_type === 'immobilier' ? '#3B82F6' : '#8B5CF6',
        })
    }

    for (const p of products.data || []) {
        items.push({
            id: `product-${p.id}`, type: 'product',
            title: `Nouveau produit — ${p.name}`,
            subtitle: `${(p.profiles as any)?.shop_name || ''} · ${p.category || ''} · ${(p.price || 0).toLocaleString('fr-FR')} F`,
            created_at: p.created_at,
            link: '/admin/products',
            badge: p.category || 'Produit', badgeColor: '#6366F1',
        })
    }

    for (const r of reviews.data || []) {
        const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating)
        items.push({
            id: `review-${r.id}`, type: 'review',
            title: `Avis ${stars} — ${(r.products as any)?.name || 'Produit'}`,
            subtitle: `Par ${r.user_name} · "${(r.content || '').slice(0, 60)}${r.content?.length > 60 ? '…' : ''}"`,
            created_at: r.created_at,
            link: '/admin/reviews',
            badge: `${r.rating}/5`, badgeColor: r.rating >= 4 ? '#22C55E' : r.rating <= 2 ? '#EF4444' : '#F59E0B',
        })
    }

    for (const v of verifs.data || []) {
        items.push({
            id: `verif-${v.id}`, type: 'verification',
            title: `Vérification — ${(v.profiles as any)?.shop_name || (v.profiles as any)?.full_name || 'Vendeur'}`,
            subtitle: `Statut : ${v.status}`,
            created_at: v.created_at,
            link: '/admin/verifications',
            badge: v.status === 'pending' ? 'À traiter' : v.status === 'approved' ? 'Approuvée' : 'Rejetée',
            badgeColor: v.status === 'pending' ? '#F59E0B' : v.status === 'approved' ? '#22C55E' : '#EF4444',
        })
    }

    for (const h of hotelReqs.data || []) {
        items.push({
            id: `hotel-req-${h.id}`, type: 'hotel_review',
            title: `Demande d'avis — ${(h.profiles as any)?.shop_name || 'Hôtel'}`,
            subtitle: `Client : ${h.guest_email} · ${(h.products as any)?.name || ''} · ${h.status}`,
            created_at: h.created_at,
            link: '/admin/hotels',
            badge: h.status === 'pending' ? 'En attente' : h.status === 'completed' ? 'Reçu' : 'Expiré',
            badgeColor: h.status === 'pending' ? '#F59E0B' : h.status === 'completed' ? '#22C55E' : '#94A3B8',
        })
    }

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return { data: items.slice(0, limit) }
}

// ─── Hotels ──────────────────────────────────────────────
export async function adminGetHotelVendors() {
    const auth = await requireAdmin()
    if ('error' in auth) return { error: auth.error }
    const supabase = svc()

    const [vendors, reviewReqs, reviews] = await Promise.all([
        supabase.from('profiles')
            .select('id, created_at, full_name, email, shop_name, subscription_plan, subscription_end_date, avatar_url, city, phone')
            .eq('role', 'vendor')
            .eq('vendor_type', 'hotel')
            .order('created_at', { ascending: false }),

        supabase.from('hotel_review_requests')
            .select('hotel_id, status')
            .in('status', ['pending', 'completed']),

        supabase.from('reviews')
            .select('id, product_id, rating, products:product_id(seller_id)'),
    ])

    const reqsByHotel = (reviewReqs.data || []).reduce((acc: any, r: any) => {
        acc[r.hotel_id] = acc[r.hotel_id] || { pending: 0, completed: 0 }
        acc[r.hotel_id][r.status]++
        return acc
    }, {})

    const reviewsByHotel = (reviews.data || []).reduce((acc: any, r: any) => {
        const sid = (r.products as any)?.seller_id
        if (sid) { acc[sid] = (acc[sid] || 0) + 1 }
        return acc
    }, {})

    const data = (vendors.data || []).map(v => ({
        ...v,
        reviewRequests: reqsByHotel[v.id] || { pending: 0, completed: 0 },
        reviewCount: reviewsByHotel[v.id] || 0,
    }))

    return { data }
}

// ─── Top produits les plus vendus ────────────────────────
export async function adminGetTopProducts(limit = 10, since?: string) {
    const auth = await requireAdmin()
    if ('error' in auth) return { error: auth.error }
    const supabase = svc()

    let q = supabase
        .from('order_items')
        .select('product_id, quantity, unit_price, products:product_id(id, name, category, img)')

    if (since) q = q.gte('created_at', since)

    const { data, error } = await q

    if (error || !data) return { data: [] }

    // Agréger par product_id côté JS
    const map = new Map<string, {
        id: string; name: string; category: string; img: string | null
        quantite: number; ca: number
    }>()

    for (const item of data) {
        const product = item.products as any
        if (!product?.id) continue
        const pid = item.product_id as string
        const qty = (item.quantity as number) || 0
        const price = (item.unit_price as number) || 0
        const existing = map.get(pid)
        if (existing) {
            existing.quantite += qty
            existing.ca += qty * price
        } else {
            map.set(pid, {
                id: product.id,
                name: product.name || '—',
                category: product.category || '',
                img: product.img || null,
                quantite: qty,
                ca: qty * price,
            })
        }
    }

    const sorted = Array.from(map.values())
        .sort((a, b) => b.quantite - a.quantite)
        .slice(0, limit)

    return { data: sorted }
}

// ─── Statistiques dashboard enrichies ────────────────────
export async function adminGetEnrichedStats() {
    const auth = await requireAdmin()
    if ('error' in auth) return { error: auth.error }
    const supabase = svc()
    const today = new Date(); today.setHours(0, 0, 0, 0)

    const [hotels, pendingHotelApprovals, totalReviews, newUsersToday] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true })
            .eq('role', 'vendor').eq('vendor_type', 'hotel'),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
            .eq('role', 'vendor').eq('vendor_type', 'hotel').eq('subscription_plan', 'hotel_free'),
        supabase.from('reviews').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString()),
    ])

    return {
        totalHotels: hotels.count || 0,
        pendingHotelApprovals: pendingHotelApprovals.count || 0,
        totalReviews: totalReviews.count || 0,
        newUsersToday: newUsersToday.count || 0,
    }
}
