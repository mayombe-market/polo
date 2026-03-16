import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export const getVendorOrders = async (sellerId: string) => {
    const supabase = getSupabaseBrowserClient()

    // On récupère les commandes où le JSONB 'items' contient au moins un produit du vendeur
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .contains('items', [{ seller_id: sellerId }])
        .order('created_at', { ascending: false })

    return { data, error }
}