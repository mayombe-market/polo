import { createClient } from '@supabase/supabase-js'
import ClientHomePage from './ClientHomePage'
import { getExpiredSellerIds, excludeExpiredSellers } from '@/lib/filterActiveProducts'

export const revalidate = 60 // Cache 60s, + revalidation on-demand à l'ajout produit

export default async function HomePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Récupérer les vendeurs expirés pour les exclure
  const expiredIds = await getExpiredSellerIds(supabase)

  // Toutes les requêtes EN PARALLÈLE (au lieu de séquentiellement)
  const [
    { data: ads },
    { data: topProducts },
    { data: categories },
    { data: newProducts },
    { data: popularProducts },
    { data: promoProducts },
  ] = await Promise.all([
    supabase.from('ads').select('id, img, title').limit(5),
    excludeExpiredSellers(
      supabase.from('products').select('id, name, price, shop, loc, views_count, img, sub_id, sub_category_uuid, created_at, seller_id, promo_percentage, promo_start_date, promo_end_date').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).order('views_count', { ascending: false }).limit(5),
      expiredIds
    ),
    supabase.from('category').select('id, name, img, sub_category (id, name)'),
    excludeExpiredSellers(
      supabase.from('products').select('id, name, price, img, category, stock_quantity, seller_id, promo_percentage, promo_start_date, promo_end_date').order('created_at', { ascending: false }).limit(8),
      expiredIds
    ),
    excludeExpiredSellers(
      supabase.from('products').select('id, name, price, img, category, stock_quantity, views_count, seller_id, promo_percentage, promo_start_date, promo_end_date').order('views_count', { ascending: false }).limit(8),
      expiredIds
    ),
    excludeExpiredSellers(
      supabase.from('products').select('id, name, price, img, category, stock_quantity, seller_id, promo_percentage, promo_start_date, promo_end_date').gt('promo_percentage', 0).gt('promo_end_date', new Date().toISOString()).order('created_at', { ascending: false }).limit(8),
      expiredIds
    ),
  ])

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-grow">
        <ClientHomePage
          ads={ads || []}
          topProducts={topProducts || []}
          categories={categories || []}
          newProducts={newProducts || []}
          popularProducts={popularProducts || []}
          promoProducts={promoProducts || []}
        />
      </div>
    </main>
  )
}
