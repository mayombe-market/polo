import { createClient } from '@supabase/supabase-js'
import LandingPageClient from './LandingPageClient'
import { IMMOBILIER_CATEGORY } from '@/lib/realEstateListing'
import { getExpiredSellerIds, excludeExpiredSellers } from '@/lib/filterActiveProducts'

export const revalidate = 60

export default async function LandingPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const expiredIds = await getExpiredSellerIds(supabase)

  const [
    { data: marketplaceProducts },
    { data: immobilierProducts },
    { data: patisserieProducts },
    { data: restaurantProducts },
  ] = await Promise.all([
    // Marketplace — produits récents hors immobilier et alimentation
    excludeExpiredSellers(
      supabase
        .from('products')
        .select('id, name, price, img, category')
        .neq('category', IMMOBILIER_CATEGORY)
        .neq('category', 'Pâtisserie & Traiteur')
        .neq('category', 'Alimentation & Boissons')
        .order('created_at', { ascending: false })
        .limit(10),
      expiredIds
    ),
    // Immobilier
    excludeExpiredSellers(
      supabase
        .from('products')
        .select('id, name, price, img, category')
        .eq('category', IMMOBILIER_CATEGORY)
        .order('created_at', { ascending: false })
        .limit(10),
      expiredIds
    ),
    // Pâtisserie
    excludeExpiredSellers(
      supabase
        .from('products')
        .select('id, name, price, img, category')
        .eq('category', 'Pâtisserie & Traiteur')
        .order('created_at', { ascending: false })
        .limit(10),
      expiredIds
    ),
    // Restaurant (Alimentation & Boissons pour l'instant)
    excludeExpiredSellers(
      supabase
        .from('products')
        .select('id, name, price, img, category')
        .eq('category', 'Alimentation & Boissons')
        .order('created_at', { ascending: false })
        .limit(10),
      expiredIds
    ),
  ])

  return (
    <LandingPageClient
      marketplaceProducts={marketplaceProducts || []}
      immobilierProducts={immobilierProducts || []}
      patisserieProducts={patisserieProducts || []}
      restaurantProducts={restaurantProducts || []}
    />
  )
}
