import { createBrowserClient } from '@supabase/ssr'

export const getFollowedProducts = async (userId: string) => {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // 1. Récupérer les IDs des vendeurs que l'utilisateur suit
    const { data: follows } = await supabase
        .from('seller_follows')
        .select('seller_id')
        .eq('follower_id', userId)

    if (!follows || follows.length === 0) return { data: [], error: null }

    const followedSellerIds = follows.map(f => f.seller_id)

    // 2. Récupérer les produits où seller_id est dans la liste des suivis
    const { data, error } = await supabase
        .from('products')
        .select(`
            *,
            profiles:seller_id (id, name, avatar_url)
        `)
        .in('seller_id', followedSellerIds) // Utilisation de ta colonne seller_id
        .order('created_at', { ascending: false })
        .limit(24)

    return { data, error }
}