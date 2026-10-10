'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { TrafficSource } from '@/lib/analytics'

function getServiceSupabase() {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll: () => [], setAll: () => {} } }
    )
}

async function getAnonSupabase() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
            },
        }
    )
}

/**
 * Enregistre un événement analytics (vue boutique ou produit).
 * Déduplication : 1 event max par session × shop × type × heure.
 */
export async function trackEvent(params: {
    shop_id: string
    product_id?: string | null
    event_type: 'shop_view' | 'product_view'
    session_id: string
    source: TrafficSource
    utm_source?: string | null
    utm_medium?: string | null
    utm_campaign?: string | null
}) {
    try {
        // Service role pour éviter les contraintes RLS à l'insert
        const supabase = getServiceSupabase()

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

        // Déduplication côté serveur
        let dupQuery = supabase
            .from('analytics_events')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', params.session_id)
            .eq('shop_id', params.shop_id)
            .eq('event_type', params.event_type)
            .gte('created_at', oneHourAgo)

        if (params.product_id) {
            dupQuery = dupQuery.eq('product_id', params.product_id)
        } else {
            dupQuery = dupQuery.is('product_id', null)
        }

        const { count } = await dupQuery
        if (count && count > 0) return { ok: true, deduped: true }

        await supabase.from('analytics_events').insert({
            shop_id: params.shop_id,
            product_id: params.product_id ?? null,
            event_type: params.event_type,
            session_id: params.session_id,
            source: params.source,
            utm_source: params.utm_source ?? null,
            utm_medium: params.utm_medium ?? null,
            utm_campaign: params.utm_campaign ?? null,
        })

        // Incrémenter views_count sur products en parallèle
        if (params.event_type === 'product_view' && params.product_id) {
            void supabase.rpc('increment_product_views', { p_product_id: params.product_id })
        }

        return { ok: true }
    } catch {
        return { ok: false }
    }
}

export interface VendorAnalyticsResult {
    shopViews: number
    uniqueVisitors: number
    productViews: number
    totalOrders: number
    confirmedOrders: number
    revenue: number
    newFollowers: number
    favoritesAdded: number
    conversionRate: string
    sourceBreakdown: Array<{ source: TrafficSource; shop_views: number; product_views: number }>
    topProducts: Array<{ id: string; name: string; img: string | null; views_count: number; confirmed_sales_count: number }>
    topSoldProducts: Array<{ id: string; name: string; img: string | null; quantity: number }>
    revenueByMonth: Array<{ month: string; revenue: number }>
}

/**
 * Récupère les données analytics agrégées pour un vendeur sur une période.
 * Vérifie que l'utilisateur connecté est bien le propriétaire de la boutique.
 */
export async function getVendorAnalytics(params: {
    shop_id: string
    from: string
    to: string
}): Promise<VendorAnalyticsResult> {
    const supabase = await getAnonSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Non authentifié')
    if (user.id !== params.shop_id) {
        // Admin peut aussi lire
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        if (profile?.role !== 'admin') throw new Error('Non autorisé')
    }

    const adminSb = getServiceSupabase()

    // ── Vues boutique ──────────────────────────────────────────────────────
    const { data: shopViewRows } = await adminSb
        .from('analytics_events')
        .select('session_id')
        .eq('shop_id', params.shop_id)
        .eq('event_type', 'shop_view')
        .gte('created_at', params.from)
        .lte('created_at', params.to)

    const shopViews = shopViewRows?.length ?? 0
    const uniqueVisitors = new Set(shopViewRows?.map(r => r.session_id) ?? []).size

    // ── Vues produits ──────────────────────────────────────────────────────
    const { count: productViews } = await adminSb
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', params.shop_id)
        .eq('event_type', 'product_view')
        .gte('created_at', params.from)
        .lte('created_at', params.to)

    // ── Breakdown par source ───────────────────────────────────────────────
    const { data: sourceRows } = await adminSb
        .rpc('get_vendor_analytics_by_source', {
            p_shop_id: params.shop_id,
            p_from: params.from,
            p_to: params.to,
        })

    // ── Commandes ──────────────────────────────────────────────────────────
    const { data: orders } = await adminSb
        .from('orders')
        .select('id, status, total_amount, created_at, items')
        .eq('seller_id', params.shop_id)
        .gte('created_at', params.from)
        .lte('created_at', params.to)

    const totalOrders = orders?.length ?? 0
    const confirmedStatuses = ['confirmed', 'shipped', 'delivered']
    const confirmedOrders = orders?.filter(o => confirmedStatuses.includes(o.status)).length ?? 0
    const revenue = orders
        ?.filter(o => confirmedStatuses.includes(o.status))
        .reduce((sum, o) => sum + (o.total_amount || 0), 0) ?? 0

    // ── Revenus mensuels (6 derniers mois, toujours) ───────────────────────
    const { data: allOrders } = await adminSb
        .from('orders')
        .select('total_amount, created_at, status')
        .eq('seller_id', params.shop_id)
        .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())

    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    const revenueByMonthMap: Record<string, number> = {}
    allOrders
        ?.filter(o => confirmedStatuses.includes(o.status))
        .forEach(o => {
            const d = new Date(o.created_at)
            const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
            revenueByMonthMap[key] = (revenueByMonthMap[key] || 0) + (o.total_amount || 0)
        })
    const revenueByMonth = Object.entries(revenueByMonthMap)
        .map(([month, revenue]) => ({ month, revenue }))
        .slice(-6)

    // ── Nouveaux abonnés ───────────────────────────────────────────────────
    const { count: newFollowers } = await adminSb
        .from('seller_follows')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', params.shop_id)
        .gte('created_at', params.from)
        .lte('created_at', params.to)

    // ── Favoris sur les produits du vendeur ───────────────────────────────
    const { data: vendorProducts } = await adminSb
        .from('products')
        .select('id, name, img, image_url, views_count, confirmed_sales_count')
        .eq('seller_id', params.shop_id)
        .eq('status', 'active')

    const productIds = vendorProducts?.map(p => p.id) ?? []

    let favoritesAdded = 0
    if (productIds.length > 0) {
        const { count } = await adminSb
            .from('favorites')
            .select('*', { count: 'exact', head: true })
            .in('product_id', productIds)
            .gte('created_at', params.from)
            .lte('created_at', params.to)
        favoritesAdded = count ?? 0
    }

    // ── Top produits par vues ──────────────────────────────────────────────
    const topProducts = [...(vendorProducts ?? [])]
        .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
        .slice(0, 5)
        .map(p => ({
            id: p.id,
            name: p.name,
            img: p.img || p.image_url || null,
            views_count: p.views_count || 0,
            confirmed_sales_count: p.confirmed_sales_count || 0,
        }))

    // ── Top produits par ventes (items dans commandes confirmées) ──────────
    const salesMap: Record<string, number> = {}
    orders
        ?.filter(o => confirmedStatuses.includes(o.status))
        .forEach(o => {
            const items = Array.isArray(o.items) ? o.items : []
            items.forEach((item: any) => {
                if (item?.id) {
                    salesMap[item.id] = (salesMap[item.id] || 0) + (item.quantity || 1)
                }
            })
        })

    const topSoldProducts = Object.entries(salesMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, quantity]) => {
            const p = vendorProducts?.find(p => p.id === id)
            return {
                id,
                name: p?.name ?? '—',
                img: p?.img || p?.image_url || null,
                quantity,
            }
        })

    const conversionRate = shopViews > 0 ? ((totalOrders / shopViews) * 100).toFixed(1) : '0.0'

    return {
        shopViews,
        uniqueVisitors,
        productViews: productViews ?? 0,
        totalOrders,
        confirmedOrders,
        revenue,
        newFollowers: newFollowers ?? 0,
        favoritesAdded,
        conversionRate,
        sourceBreakdown: (sourceRows ?? []) as VendorAnalyticsResult['sourceBreakdown'],
        topProducts,
        topSoldProducts,
        revenueByMonth,
    }
}

/**
 * Répond à un avis côté vendeur.
 * Vérifie que l'utilisateur est bien le vendeur du produit concerné.
 */
export async function replyToReview(reviewId: string, reply: string) {
    const supabase = await getAnonSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')

    const trimmed = reply.trim()
    if (!trimmed || trimmed.length > 1000) throw new Error('Réponse invalide (1–1000 caractères)')

    // Vérifier que le review concerne un produit du vendeur
    const { data: review } = await supabase
        .from('reviews')
        .select('id, product_id, products(seller_id)')
        .eq('id', reviewId)
        .single()

    if (!review) throw new Error('Avis introuvable')
    const product = Array.isArray(review.products) ? review.products[0] : review.products as any
    if (product?.seller_id !== user.id) throw new Error('Non autorisé')

    const { error } = await supabase
        .from('reviews')
        .update({ vendor_reply: trimmed, vendor_reply_at: new Date().toISOString() })
        .eq('id', reviewId)

    if (error) throw new Error(error.message)
    return { ok: true }
}

/**
 * Soumet un avis vérifié : vérifie que l'acheteur a bien commandé ce produit.
 */
export async function submitVerifiedReview(params: {
    product_id: string
    rating: number
    content: string
    image_urls?: string[]
}) {
    const supabase = await getAnonSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Connectez-vous pour laisser un avis')

    if (params.rating < 1 || params.rating > 5) throw new Error('Note invalide')
    if (!params.content?.trim()) throw new Error('Le commentaire est requis')

    // Vérifier que l'utilisateur n'est pas le vendeur
    const { data: product } = await supabase
        .from('products')
        .select('seller_id')
        .eq('id', params.product_id)
        .single()

    if (product?.seller_id === user.id) throw new Error('Vous ne pouvez pas noter votre propre produit')

    // Vérifier achat confirmé
    const { data: orders } = await supabase
        .from('orders')
        .select('id, items, status')
        .eq('user_id', user.id)
        .in('status', ['confirmed', 'shipped', 'delivered'])

    const hasPurchased = orders?.some(o =>
        Array.isArray(o.items) && o.items.some((item: any) => item?.id === params.product_id)
    ) ?? false

    if (!hasPurchased) throw new Error('Vous devez avoir acheté ce produit pour laisser un avis')

    // Vérifier pas d'avis existant
    const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('product_id', params.product_id)
        .eq('user_id', user.id)
        .maybeSingle()

    if (existing) throw new Error('Vous avez déjà laissé un avis pour ce produit')

    // Récupérer le profil
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single()

    const { error } = await supabase.from('reviews').insert({
        product_id: params.product_id,
        user_id: user.id,
        rating: params.rating,
        content: params.content.trim(),
        user_name: profile?.full_name || 'Client',
        user_avatar: profile?.avatar_url || null,
        images: params.image_urls ?? [],
    })

    if (error) throw new Error(error.message)
    return { ok: true }
}

/**
 * Notifie les abonnés d'une boutique qu'un nouveau produit vient d'être publié.
 * Déduplication : 1 notification max par vendeur par abonné par jour.
 */
export async function notifyFollowersNewProduct(
    productId: string,
    vendorId: string,
    productName: string
) {
    try {
        const adminSb = getServiceSupabase()

        const { data: followers } = await adminSb
            .from('seller_follows')
            .select('follower_id')
            .eq('seller_id', vendorId)

        if (!followers || followers.length === 0) return

        const { data: vendor } = await adminSb
            .from('profiles')
            .select('shop_name, full_name')
            .eq('id', vendorId)
            .single()

        const shopName = vendor?.shop_name || vendor?.full_name || 'Une boutique'
        const today = new Date().toISOString().slice(0, 10)

        const notifications = followers.map(({ follower_id }) => ({
            user_id: follower_id,
            type: 'new_product',
            title: `${shopName} a publié un nouveau produit`,
            body: productName,
            link: `/product/${productId}`,
            reference_id: `new_product_${vendorId}_${follower_id}_${today}`,
        }))

        // upsert idempotent : clé composite (user_id, type, reference_id)
        await adminSb
            .from('notifications')
            .upsert(notifications, { onConflict: 'user_id,type,reference_id', ignoreDuplicates: true })
    } catch (e) {
        console.error('[notifyFollowersNewProduct]', e)
    }
}
