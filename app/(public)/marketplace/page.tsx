import { createClient } from '@supabase/supabase-js'
import ClientHomePage from '../ClientHomePage'
import { getExpiredSellerIds, getSuspendedSellerIds, excludeExpiredSellers } from '@/lib/filterActiveProducts'
import { IMMOBILIER_CATEGORY } from '@/lib/realEstateListing'
import { mergeHeroSlides } from '@/lib/mergeHeroSlides'
import { heroImageUrl, heroImageSrcSet } from '@/lib/heroImageUrl'
import { pickSideHighlightPair } from '@/lib/homeHighlights'
import { isHiddenCategory } from '@/lib/hiddenCategories'

/** Produits affichés au départ (le reste se charge à la demande) */
const TREND_LIMIT = 16
const NEW_PRODUCTS_LIMIT = 12

export const revalidate = 30

export default async function MarketplacePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const serviceSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [expiredIds, suspendedIds] = await Promise.all([
    getExpiredSellerIds(supabase),
    getSuspendedSellerIds(supabase),
  ])
  const excludedIds = [...new Set([...expiredIds, ...suspendedIds])]

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Toutes les requêtes en un seul round-trip (produits + compteurs estimatifs).
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
    productsCountRes,
    vendorsCountRes,
    { data: platformReviews },
  ] = await Promise.all([
    supabase.from('ads').select('id, img, title, link_url, is_active, position').eq('is_active', true).order('position', { ascending: true }).limit(10),
    supabase.from('vendor_ad_campaigns').select('id, title, description, image_url, link_url, display_order').eq('placement', 'hero').order('display_order', { ascending: true }),
    supabase.from('vendor_ad_campaigns').select('id, title, description, image_url, link_url, display_order').eq('placement', 'tile').order('display_order', { ascending: true }),
    excludeExpiredSellers(
      supabase.from('products').select('id, name, price, shop, loc, views_count, img, images_gallery, sub_id, sub_category_uuid, created_at, seller_id, promo_percentage, promo_start_date, promo_end_date').neq('category', IMMOBILIER_CATEGORY).neq('category', 'Pâtisserie & Traiteur').neq('category', 'Alimentation & Boissons').gte('created_at', sevenDaysAgo).order('views_count', { ascending: false }).limit(5),
      excludedIds
    ),
    supabase.from('category').select('id, name, img'),
    excludeExpiredSellers(
      supabase.from('products').select('id, name, price, img, images_gallery, category, stock_quantity, has_stock, seller_id, promo_percentage, promo_start_date, promo_end_date, created_at').neq('category', IMMOBILIER_CATEGORY).neq('category', 'Pâtisserie & Traiteur').neq('category', 'Alimentation & Boissons').order('created_at', { ascending: false }).limit(NEW_PRODUCTS_LIMIT),
      excludedIds
    ),
    excludeExpiredSellers(
      supabase.from('products').select('id, name, price, img, images_gallery, category, stock_quantity, has_stock, views_count, seller_id, promo_percentage, promo_start_date, promo_end_date, created_at').neq('category', IMMOBILIER_CATEGORY).neq('category', 'Pâtisserie & Traiteur').neq('category', 'Alimentation & Boissons').order('views_count', { ascending: false }).limit(8),
      excludedIds
    ),
    excludeExpiredSellers(
      supabase.from('products').select('id, name, price, img, images_gallery, category, stock_quantity, has_stock, seller_id, promo_percentage, promo_start_date, promo_end_date, created_at').neq('category', IMMOBILIER_CATEGORY).neq('category', 'Pâtisserie & Traiteur').neq('category', 'Alimentation & Boissons').gt('promo_percentage', 0).gt('promo_end_date', now.toISOString()).order('created_at', { ascending: false }).limit(8),
      excludedIds
    ),
    excludeExpiredSellers(
      supabase.from('products').select('id, name, price, img, images_gallery, category, stock_quantity, has_stock, views_count, seller_id, promo_percentage, promo_start_date, promo_end_date, created_at').neq('category', IMMOBILIER_CATEGORY).neq('category', 'Pâtisserie & Traiteur').neq('category', 'Alimentation & Boissons').order('views_count', { ascending: false }).limit(TREND_LIMIT),
      excludedIds
    ),
    supabase.from('reviews').select('id, rating, content, user_name, created_at, products:product_id(name, img, category)').gte('rating', 4).not('content', 'is', null).order('created_at', { ascending: false }).limit(8),
    // Compteurs estimatifs (pg_stats, ~1 ms vs ~80 ms COUNT exact) — suffisants pour affichage.
    supabase.from('products').select('*', { count: 'estimated', head: true }),
    supabase.from('profiles').select('*', { count: 'estimated', head: true }).eq('role', 'vendor'),
    // Avis plateforme — service_role pour bypasser RLS (auth.uid() = user_id)
    serviceSupabase.from('ratings').select('id, platform_rating, comment, created_at, profiles:user_id(full_name)').not('platform_rating', 'is', null).not('comment', 'is', null).gte('platform_rating', 1).order('created_at', { ascending: false }).limit(10),
  ])

  const totalProducts = productsCountRes.count ?? 0
  const totalVendors = vendorsCountRes.count ?? 0

  const heroCampaignRows = heroCampRes.error ? [] : heroCampRes.data ?? []
  const tileCampaignRows = tileCampRes.error ? [] : tileCampRes.data ?? []

  // Seuls 2 produits de ces listes sont affichés : on ne les envoie pas en entier au navigateur
  const sideHighlightPair = pickSideHighlightPair(
    [...(popularProducts || []), ...(newProducts || []), ...(promoProducts || []), ...(topProducts || [])],
    trendProducts || []
  )

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
          categories={(categories || []).filter(c => !isHiddenCategory(c.name))}
          newProducts={newProducts || []}
          newProductsPageSize={NEW_PRODUCTS_LIMIT}
          sideHighlightPair={sideHighlightPair}
          spotlightPair={topProducts && topProducts.length >= 2 ? [topProducts[0], topProducts[1]] : null}
          hasActivePromo={(promoProducts || []).length > 0}
          trendProducts={trendProducts || []}
          homeReviews={homeReviews || []}
          platformReviews={platformReviews || []}
          totalProducts={totalProducts}
          totalVendors={totalVendors}
        />
      </div>
    </main>
  )
}
