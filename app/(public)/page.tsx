import { createClient } from '@supabase/supabase-js'
import ClientHomePage from './ClientHomePage'

export const revalidate = 60 // Cache 60s, + revalidation on-demand à l'ajout produit

export default async function HomePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Toutes les requêtes EN PARALLÈLE (au lieu de séquentiellement)
  const [
    { data: ads },
    { data: topProducts },
    { data: categories },
    { data: newProducts },
    { data: popularProducts },
    { data: vendorProfiles },
  ] = await Promise.all([
    supabase.from('ads').select('id, img, title').limit(5),
    supabase.from('products').select('id, name, price, shop, loc, views_count, img, sub_id, sub_category_uuid, created_at').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).order('views_count', { ascending: false }).limit(5),
    supabase.from('category').select('id, name, img, sub_category (id, name)'),
    supabase.from('products').select('id, name, price, img, category, stock_quantity, seller_id').order('created_at', { ascending: false }).limit(8),
    supabase.from('products').select('id, name, price, img, category, stock_quantity, views_count, seller_id').order('views_count', { ascending: false }).limit(8),
    supabase.from('profiles').select('id, full_name, avatar_url').eq('role', 'vendor'),
  ])

  // Compter les produits par vendeur à partir des données déjà récupérées
  const sellerCounts: Record<string, number> = {}
  const allFetchedProducts = [...(newProducts || []), ...(popularProducts || [])]
  allFetchedProducts.forEach((p) => {
    if (p.seller_id) {
      sellerCounts[p.seller_id] = (sellerCounts[p.seller_id] || 0) + 1
    }
  })

  const topSellers = (vendorProfiles || [])
    .map((s) => ({ ...s, product_count: sellerCounts[s.id] || 0 }))
    .filter((s) => s.product_count > 0)
    .sort((a, b) => b.product_count - a.product_count)
    .slice(0, 4)

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-grow">
        <ClientHomePage
          ads={ads || []}
          topProducts={topProducts || []}
          categories={categories || []}
          newProducts={newProducts || []}
          popularProducts={popularProducts || []}
          topSellers={topSellers}
        />
      </div>
    </main>
  )
}
