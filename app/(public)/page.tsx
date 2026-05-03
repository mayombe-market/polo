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

  // Quelques produits récents pour la section "Découvertes du moment"
  const { data: discoveryProducts } = await excludeExpiredSellers(
    supabase
      .from('products')
      .select('id, name, price, img, category')
      .neq('category', IMMOBILIER_CATEGORY)
      .order('created_at', { ascending: false })
      .limit(10),
    expiredIds
  )

  return <LandingPageClient discoveryProducts={discoveryProducts || []} />
}
