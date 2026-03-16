import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { isSubscriptionExpiredPastGrace } from '@/lib/subscription'

export const getSellerData = async (sellerId: string) => {
    const supabase = getSupabaseBrowserClient()

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

    // 5. Avis basés sur les notations après commande (via RPC SECURITY DEFINER pour contourner RLS)
    let reviews: any[] = []
    try {
        const { data: reviewsData, error: reviewsError } = await supabase.rpc('get_seller_reviews', {
            p_seller_id: sellerId
        })
        if (reviewsError) {
            console.error('Erreur RPC get_seller_reviews:', reviewsError)
        } else {
            reviews = reviewsData || []
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
