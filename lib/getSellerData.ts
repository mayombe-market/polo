import { createBrowserClient } from '@supabase/ssr'

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

    // 2. Ses produits
    let products: any[] = []
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

    // 5. Avis agrégés de tous les produits du vendeur
    let reviews: any[] = []
    try {
        const productIds = products.map((p: any) => p.id)
        if (productIds.length > 0) {
            const { data: reviewsData } = await supabase
                .from('reviews')
                .select('*')
                .in('product_id', productIds)
                .order('created_at', { ascending: false })
            reviews = reviewsData || []
        }
    } catch (e) {
        console.error('Erreur reviews:', e)
    }

    // 6. Calcul de la note moyenne
    const reviewCount = reviews.length
    const averageRating = reviewCount > 0
        ? reviews.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) / reviewCount
        : 0

    return {
        profile,
        products,
        followerCount,
        followingCount,
        reviews,
        reviewCount,
        averageRating: Math.round(averageRating * 10) / 10,
        error: profileError
    }
}
