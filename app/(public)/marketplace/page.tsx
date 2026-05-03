import { createClient } from '@supabase/supabase-js'
import ClientHomePage from '../ClientHomePage'
import { getExpiredSellerIds, excludeExpiredSellers } from '@/lib/filterActiveProducts'
import { IMMOBILIER_CATEGORY } from '@/lib/realEstateListing'
import { mergeHeroSlides } from '@/lib/mergeHeroSlides'
import { heroImageUrl, heroImageSrcSet } from '@/lib/heroImageUrl'

export const revalidate = 30

export default async function MarketplacePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const expiredIds = await getExpiredSellerIds(supabase)

  const [
    { data: ads },
    heroCampRes,
    tileCampRes,
    { data: topProducts },
    { data: categories },
    { data: newProducts },
    { data: popularProducts },
    { data: promoProducts },
    { data: trendProducts },
    { data: homeReviews },
  ] = await Promise.all([
    supabase.from('ads').select('id, img, title, link_url, is_active, position').eq('is_active', true).order('position', { ascending: true }).limit(10),
    supabase.from('vendor_ad_campaigns').select('id, title, description, image_url, link_url, display_order').eq('placement', 'hero').order('display_order', { ascending: true }),
    supabase.from('vendor_ad_campaigns').select('id, title, description, image_url, link_url, display_order').eq('placement', 'tile').order('display_order', { ascending: true }),
    excludeExpiredSellers(
      supabase.from('products').select('id, name, price, shop, loc, views_count, img, images_gallery, sub_id, sub_category_uuid, created_at, seller_id, promo_percentage, promo_start_date, promo_end_date').neq('category', IMMOBILIER_CATEGORY).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).order('views_count', { ascending: false }).limit(5),
      expiredIds
    ),
    supabase.from('category').select('id, name, img, sub_category (id, name)'),
    excludeExpiredSellers(
      supabase.from('products').select('id, name, price, img, images_gallery, category, stock_quantity, seller_id, promo_percentage, promo_start_date, promo_end_date, created_at').neq('category', IMMOBILIER_CATEGORY).order('created_at', { ascending: false }).limit(20),
      expiredIds
    ),
    excludeExpiredSellers(
      supabase.from('products').select('id, name, price, img, images_gallery, category, stock_quantity, views_count, seller_id, promo_percentage, promo_start_date, promo_end_date, created_at').neq('category', IMMOBILIER_CATEGORY).order('views_count', { ascending: false }).limit(8),
      expiredIds
    ),
    excludeExpiredSellers(
      supabase.from('products').select('id, name, price, img, images_gallery, category, stock_quantity, seller_id, promo_percentage, promo_start_date, promo_end_date, created_at').neq('category', IMMOBILIER_CATEGORY).gt('promo_percentage', 0).gt('promo_end_date', new Date().toISOString()).order('created_at', { ascending: false }).limit(8),
      expiredIds
    ),
    excludeExpiredSellers(
      supabase.from('products').select('id, name, price, img, images_gallery, category, stock_quantity, views_count, seller_id, promo_percentage, promo_start_date, promo_end_date, created_at').neq('category', IMMOBILIER_CATEGORY).order('views_count', { ascending: false }).limit(30),
      expiredIds
    ),
    supabase.from('reviews').select('id, rating, content, user_name, created_at, products:product_id(name, img, category)').gte('rating', 4).not('content', 'is', null).order('created_at', { ascending: false }).limit(8),
  ])

  const [productsCountRes, vendorsCountRes] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'vendor'),
  ])
  const totalProducts = productsCountRes.count ?? 0
  const totalVendors = vendorsCountRes.count ?? 0

  const heroCampaignRows = heroCampRes.error ? [] : heroCampRes.data ?? []
  const tileCampaignRows = tileCampRes.error ? [] : tileCampRes.data ?? []

  const heroSlides = mergeHeroSlides(ads || [], heroCampaignRows)
  const firstHeroImg = heroSlides[0]?.img
  const heroPreloadHref = firstHeroImg ? heroImageUrl(firstHeroImg, 960) : null
  const heroPreloadSrcSet = firstHeroImg ? heroImageSrcSet(firstHeroImg) : null

  return (
    <main className="min-h-screen flex flex-col">
      {heroPreloadHref ? (
        <link
          rel="preload"
          as="image"
          href={heroPreloadHref}
          imageSrcSet={heroPreloadSrcSet ?? undefined}
          imageSizes="(max-width: 768px) 100vw, 54vw"
          fetchPriority="high"
        />
      ) : null}
      <div className="flex-grow">
        <ClientHomePage
          heroSlides={heroSlides}
          tileCampaigns={tileCampaignRows}
          topProducts={topProducts || []}
          categories={categories || []}
          newProducts={newProducts || []}
          popularProducts={popularProducts || []}
          promoProducts={promoProducts || []}
          trendProducts={trendProducts || []}
          homeReviews={homeReviews || []}
          totalProducts={totalProducts}
          totalVendors={totalVendors}
        />
      </div>
    </main>
  )
}
