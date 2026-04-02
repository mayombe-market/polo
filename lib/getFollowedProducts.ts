import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getExpiredSellerIds } from '@/lib/filterActiveProducts'

export const getFollowedProducts = async (userId: string) => {
    const supabase = getSupabaseBrowserClient()

    // 1. Récupérer les IDs des vendeurs que l'utilisateur suit
    const { data: follows } = await supabase
        .from('seller_follows')
        .select('seller_id')
        .eq('follower_id', userId)

    if (!follows || follows.length === 0) return { data: [], error: null }

    const followedSellerIds = follows.map((f: { seller_id: string }) => f.seller_id)

    // Exclure les vendeurs expirés de la liste des suivis
    const expiredIds = await getExpiredSellerIds(supabase)
    const expiredSet = new Set(expiredIds)
    const activeSellerIds = followedSellerIds.filter((id: string) => !expiredSet.has(id))
    if (activeSellerIds.length === 0) return { data: [], error: null }

    // 2. Récupérer les produits où seller_id est dans la liste des suivis actifs
    const { data, error } = await supabase
        .from('products')
        .select(`
            *,
            profiles:seller_id (id, name, avatar_url)
        `)
        .in('seller_id', activeSellerIds) // Utilisation de ta colonne seller_id (vendeurs actifs uniquement)
        .order('created_at', { ascending: false })
        .limit(24)

    return { data, error }
}