import { createBrowserClient } from '@supabase/ssr'

export const getVendorOrders = async (sellerId: string) => {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // On récupère les commandes où le JSONB 'items' contient au moins un produit du vendeur
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .contains('items', [{ seller_id: sellerId }])
        .order('created_at', { ascending: false })

    return { data, error }
}