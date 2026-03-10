import { createBrowserClient } from '@supabase/ssr'
import { isSubscriptionExpiredPastGrace } from '@/lib/subscription'

export const getSellerData = async (sellerId: string) => {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // 1. Infos du profil (query essentielle)
    let profile: any = null
    let profileError: any = null
    try {
        const res = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sellerId)
            .single()
        profile = res.data
        profileError = res.error
    } catch (e) {
        console.error('Erreur profil:', e)
        profileError = e
    }

    // Vérifier si le vendeur est expiré (produits masqués)
    const sellerExpired = profile
        && profile.subscription_plan
        && profile.subscription_plan !== 'free'
        && isSubscriptionExpiredPastGrace(profile)

    // 2. Ses produits (vide si vendeur expiré)
    let products: any[] = []
    if (!sellerExpired) {
        try {
            const res = await supabase
                .from('products')
                .select('*')
                .eq('seller_id', sellerId)
                .order('created_at', { ascending: false })
            products = res.data || []
        } catch (e) {
            console.error('Erreur produits:', e)
        }
    }

    // 3. Nombre de followers (gens qui suivent ce vendeur)
    let followerCount = 0
    try {
        const { count } = await supabase
            .from('seller_follows')
            .select('*', { count: 'exact', head: true })
            .eq('seller_id', sellerId)
        followerCount = count || 0
    } catch (e) {
        console.error('Erreur followerCount:', e)
    }

    // 4. Nombre de vendeurs que cette personne suit
    let followingCount = 0
    try {
        const { count } = await supabase
            .from('seller_follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', sellerId)
        followingCount = count || 0
    } catch (e) {
        console.error('Erreur followingCount:', e)
    }

    // 5. Avis basés sur les notations après commande (table ratings)
    let reviews: any[] = []
    try {
        // Récupérer les commandes confirmées par les clients contenant des produits de ce vendeur
        const { data: allOrders } = await supabase
            .from('orders')
            .select('id, items, user_id')
            .eq('client_confirmed', true)

        const sellerOrders = (allOrders || []).filter(
            (o: any) => o.items?.some((i: any) => i.seller_id === sellerId)
        )
        const orderIds = sellerOrders.map((o: any) => o.id)

        if (orderIds.length > 0) {
            const { data: ratingsData } = await supabase
                .from('ratings')
                .select('*')
                .in('order_id', orderIds)
                .order('created_at', { ascending: false })

            if (ratingsData && ratingsData.length > 0) {
                // Récupérer les profils des notateurs (avatar + nom)
                const userIds = [...new Set(ratingsData.map((r: any) => r.user_id))]
                const { data: ratingProfiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .in('id', userIds)

                const profileMap = new Map((ratingProfiles || []).map((p: any) => [p.id, p]))
                const orderMap = new Map(sellerOrders.map((o: any) => [o.id, o]))

                reviews = ratingsData
                    .filter((r: any) => r.vendor_rating && r.vendor_rating > 0)
                    .map((r: any) => {
                        const rProfile = profileMap.get(r.user_id)
                        const order = orderMap.get(r.order_id)
                        const sellerItems = (order?.items || []).filter((i: any) => i.seller_id === sellerId)
                        return {
                            id: r.id,
                            rating: r.vendor_rating,
                            user_name: rProfile?.full_name || 'Client',
                            user_avatar: rProfile?.avatar_url || null,
                            comment: r.comment || '',
                            vendor_tags: r.vendor_tags || [],
                            delivery_rating: r.delivery_rating || 0,
                            created_at: r.created_at,
                            product_name: sellerItems.map((i: any) => i.name).join(', '),
                        }
                    })
            }
        }
    } catch (e) {
        console.error('Erreur ratings:', e)
    }

    // 6. Calcul de la note moyenne (basée sur vendor_rating)
    const reviewCount = reviews.length
    const averageRating = reviewCount > 0
        ? reviews.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) / reviewCount
        : 0

    return {
        profile,
        products,
        sellerExpired: !!sellerExpired,
        followerCount,
        followingCount,
        reviews,
        reviewCount,
        averageRating: Math.round(averageRating * 10) / 10,
        error: profileError
    }
}
