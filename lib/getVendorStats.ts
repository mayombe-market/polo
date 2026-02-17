import { createBrowserClient } from '@supabase/ssr'

export const getVendorStats = async (sellerId: string) => {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // 1. Compter les abonnés
    const { count: followers } = await supabase
        .from('seller_follows')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId)

    // 2. Compter les produits actifs
    const { count: products } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId)

    return {
        followers: followers || 0,
        products: products || 0,
    }
}