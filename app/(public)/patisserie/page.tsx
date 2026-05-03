import { createClient } from '@supabase/supabase-js'
import { getExpiredSellerIds, excludeExpiredSellers } from '@/lib/filterActiveProducts'
import PatisserieClient from './PatisserieClient'

export const revalidate = 60

export const metadata = {
    title: 'Pâtisserie & Boulangerie — Mayombe Market',
    description: 'Commandez vos gâteaux, cupcakes, box sucrées et viennoiseries auprès des meilleures pâtisseries de Brazzaville et Pointe-Noire.',
}

export default async function PatisseriePage() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const expiredIds = await getExpiredSellerIds(supabase)

    // Produits pâtisserie
    const { data: products } = await excludeExpiredSellers(
        supabase
            .from('products')
            .select('id, name, price, img, images_gallery, category, seller_id, created_at, views_count, stock_quantity, promo_percentage, promo_start_date, promo_end_date')
            .eq('category', 'Pâtisserie & Traiteur')
            .order('views_count', { ascending: false })
            .limit(20),
        expiredIds
    )

    // Vendeurs qui ont des produits pâtisserie
    const sellerIds = [...new Set((products || []).map((p: any) => p.seller_id).filter(Boolean))]
    const { data: sellers } = sellerIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, shop_name, store_name, avatar_url, city, verification_status, phone, whatsapp_number')
            .in('id', sellerIds)
            .eq('role', 'vendor')
        : { data: [] }

    // Associer les images de couverture (premier produit de chaque vendeur)
    const sellerCoverMap: Record<string, string | null> = {}
    for (const p of products || []) {
        if (p.seller_id && !sellerCoverMap[p.seller_id]) {
            sellerCoverMap[p.seller_id] = p.img || null
        }
    }

    const enrichedSellers = (sellers || []).map((s: any) => ({
        ...s,
        coverImg: sellerCoverMap[s.id] || null,
    }))

    return (
        <PatisserieClient
            products={products || []}
            sellers={enrichedSellers}
        />
    )
}
