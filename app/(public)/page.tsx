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
    excludeExpiredSellers(
      supabase.from('products').select('id, name, price, img, category, created_at, views_count')
        .neq('category', IMMOBILIER_CATEGORY)
        .neq('category', 'Pâtisserie & Traiteur')
        .neq('category', 'Alimentation & Boissons')
        .order('created_at', { ascending: false }).limit(12),
      expiredIds
    ),
    excludeExpiredSellers(
      supabase.from('products').select('id, name, price, img, category, created_at, views_count')
        .eq('category', IMMOBILIER_CATEGORY)
        .order('created_at', { ascending: false }).limit(12),
      expiredIds
    ),
    excludeExpiredSellers(
      supabase.from('products').select('id, name, price, img, category, created_at, views_count')
        .eq('category', 'Pâtisserie & Traiteur')
        .order('created_at', { ascending: false }).limit(12),
      expiredIds
    ),
    excludeExpiredSellers(
      supabase.from('products').select('id, name, price, img, category, created_at, views_count')
        .eq('category', 'Alimentation & Boissons')
        .order('created_at', { ascending: false }).limit(12),
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
