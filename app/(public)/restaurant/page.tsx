import { createClient } from '@supabase/supabase-js'
import { getExpiredSellerIds, excludeExpiredSellers } from '@/lib/filterActiveProducts'
import RestaurantClient from './RestaurantClient'

export const revalidate = 60

export const metadata = {
  title: 'Restaurants & Fast-Food — Mayombe Market',
  description: 'Commandez vos plats préférés auprès des meilleurs restaurants de Brazzaville et Pointe-Noire. Plats congolais, grillades, burgers et menus du jour.',
}

export default async function RestaurantPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const expiredIds = await getExpiredSellerIds(supabase)

  // Produits restaurant (Alimentation & Boissons uniquement)
  const { data: products } = await excludeExpiredSellers(
    supabase
      .from('products')
      .select('id, name, price, img, images_gallery, category, seller_id, created_at, views_count, stock_quantity, promo_percentage, promo_start_date, promo_end_date')
      .eq('category', 'Alimentation & Boissons')
      .order('views_count', { ascending: false })
      .limit(30),
    expiredIds
  )

  // Vendeurs ayant des produits Alimentation & Boissons
  const sellerIds = [...new Set((products || []).map((p: any) => p.seller_id).filter(Boolean))]
  const { data: sellers } = sellerIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, shop_name, store_name, avatar_url, city, verification_status, phone, whatsapp_number, shop_description, bio')
        .in('id', sellerIds)
        .eq('role', 'vendor')
    : { data: [] }

  // Cover image = premier produit par vendeur + nombre de plats par vendeur
  const sellerCoverMap: Record<string, string | null> = {}
  const sellerProductCount: Record<string, number> = {}
  for (const p of products || []) {
    if (p.seller_id) {
      if (!sellerCoverMap[p.seller_id]) sellerCoverMap[p.seller_id] = p.img || null
      sellerProductCount[p.seller_id] = (sellerProductCount[p.seller_id] || 0) + 1
    }
  }

  const enrichedSellers = (sellers || []).map((s: any) => ({
    ...s,
    coverImg: sellerCoverMap[s.id] || null,
    productCount: sellerProductCount[s.id] || 0,
  }))

  return (
    <RestaurantClient
      products={products || []}
      sellers={enrichedSellers}
    />
  )
}
