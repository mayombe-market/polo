import { createBrowserClient } from '@supabase/ssr'

export const getSellerData = async (sellerId: string) => {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // 1. Infos du profil + Nombre de followers
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
            *,
            seller_follows!seller_id(count)
        `)
        .eq('id', sellerId)
        .single()

    // 2. Ses produits
    const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })

    return {
        profile,
        products: products || [],
        followerCount: profile?.seller_follows?.[0]?.count || 0,
        error: profileError || productsError
    }
}