'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import ProductCard from '@/app/components/ProductCard'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import VendorMarketDrawer from '@/app/components/VendorMarketDrawer'
import TrustMarquee from '@/app/components/TrustMarquee'
import TrendsProductSlider from '@/app/components/TrendsProductSlider'
import PubProductMixSlider from '@/app/components/PubProductMixSlider'
import { Truck, Store, ArrowRight, ShieldCheck, ChevronLeft, ChevronRight, PackageX } from 'lucide-react'
import type { UnifiedHeroSlide } from '@/lib/mergeHeroSlides'
import { normalizeProductImageUrl } from '@/lib/resolveProductImageUrl'
import { heroImageUrl, heroImageSrcSet } from '@/lib/heroImageUrl'

/** Visuel central « confiance » (hors catalogue) — livraison / soin colis ; remplaçable par une image maison. */
const REASSURANCE_HERO_IMAGE =
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1600&auto=format&fit=crop'

function firstGalleryUrl(g: unknown): string {
    if (!Array.isArray(g) || g.length === 0) return ''
    const first = g[0]
    return typeof first === 'string' ? first.trim() : ''
}

function sideProductImageUrl(p: { img?: string | null; images_gallery?: string[] | null }): string {
    const raw = (p?.img || firstGalleryUrl(p?.images_gallery) || '').trim()
    const url = normalizeProductImageUrl(raw)
    return url || '/placeholder-image.svg'
}

type TileCampaign = {
    id: string
    title?: string | null
    description?: string | null
    image_url: string
    link_url: string
    display_order?: number | null
}

interface PlatformReview {
    id: string
    platform_rating: number
    comment: string
    created_at: string
    profiles?: { full_name?: string | null } | { full_name?: string | null }[] | null
}

interface ClientHomePageProps {
    heroSlides: UnifiedHeroSlide[]
    tileCampaigns: TileCampaign[]
    categories: any[]
    newProducts: any[]
    /** Nombre de nouveautés chargées au départ (et à chaque « Voir plus ») */
    newProductsPageSize?: number
    sideHighlightPair: [any, any] | null
    /** Rubrique « En lumière » : les 2 produits les plus vus de la semaine */
    spotlightPair: [any, any] | null
    hasActivePromo: boolean
    trendProducts: any[]
    homeReviews?: any[]
    platformReviews?: PlatformReview[]
    totalProducts?: number
    totalVendors?: number
}

/** Titres centrés type vitrine (Sophie) */
function SophieSectionTitle({ label, title }: { label: string; title: string }) {
    return (
        <div className="mb-12 text-center md:mb-16">
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-neutral-400">{label}</p>
            <h2 className="mt-3 text-3xl font-light tracking-tight text-neutral-900 md:text-4xl dark:text-white">{title}</h2>
            <div className="mx-auto mt-5 h-px w-12 bg-neutral-300 dark:bg-neutral-600" />
        </div>
    )
}

export default function ClientHomePage({
    heroSlides,
    tileCampaigns,
    categories,
    newProducts,
    newProductsPageSize = 20,
    sideHighlightPair,
    spotlightPair,
    hasActivePromo,
    trendProducts,
    homeReviews = [],
    platformReviews = [],
    totalProducts = 0,
    totalVendors = 0,
}: ClientHomePageProps) {
    const [currentAdIndex, setCurrentAdIndex] = useState(0)
    const [vendorDrawerOpen, setVendorDrawerOpen] = useState(false)

    // Load-more nouveautés
    const [displayedNewProducts, setDisplayedNewProducts] = useState<any[]>(() => newProducts.slice(0, newProductsPageSize))
    const [newProductsOffset, setNewProductsOffset] = useState(newProducts.length)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMoreNewProducts, setHasMoreNewProducts] = useState(newProducts.length >= newProductsPageSize)

    const loadMoreNewProducts = useCallback(async () => {
        setLoadingMore(true)
        try {
            const supabase = getSupabaseBrowserClient()
            const { data, error } = await supabase
                .from('products')
                .select('id, name, price, img, images_gallery, category, stock_quantity, has_stock, seller_id, promo_percentage, promo_start_date, promo_end_date, created_at')
                .neq('category', 'Immobilier')
                .order('created_at', { ascending: false })
                .range(newProductsOffset, newProductsOffset + newProductsPageSize - 1)

            if (error) {
                console.error('[loadMore] Erreur:', error.message)
                return
            }

            const moreProducts = data || []
            if (moreProducts.length > 0) {
                setDisplayedNewProducts(prev => [...prev, ...moreProducts])
                setNewProductsOffset(prev => prev + moreProducts.length)
            }
            if (moreProducts.length < newProductsPageSize) {
                setHasMoreNewProducts(false)
            }
        } catch (err) {
            console.error('[loadMore] Erreur:', err)
        } finally {
            setLoadingMore(false)
        }
    }, [newProductsOffset, newProductsPageSize])

    const safeHeroSlides = useMemo(() => (Array.isArray(heroSlides) ? heroSlides : []), [heroSlides])
    const safeTileCampaigns = useMemo(
        () => (Array.isArray(tileCampaigns) ? tileCampaigns : []),
        [tileCampaigns]
    )
    const safeCategories = useMemo(() => (Array.isArray(categories) ? categories : []), [categories])

    const trendsList = Array.isArray(trendProducts) ? trendProducts : []


    /** Deux emplacements tuiles (même gabarit que les catégories) : campagnes puis repli catégories. */
    let categoryCursor = 0
    const nextCategory = () => {
        const c = safeCategories[categoryCursor]
        if (c) categoryCursor += 1
        return c ?? null
    }
    const fixedTileLeft = safeTileCampaigns[0] ?? nextCategory()
    const fixedTileRight = safeTileCampaigns[1] ?? nextCategory()
    const scrollTileCampaigns = safeTileCampaigns.slice(2)
    const categoryRest = safeCategories.slice(categoryCursor)

    const asymmetricPair = spotlightPair

    useEffect(() => {
        if (safeHeroSlides.length <= 1) return
        const interval = setInterval(() => {
            setCurrentAdIndex((prev) => (prev + 1) % safeHeroSlides.length)
        }, 6000)
        return () => clearInterval(interval)
    }, [safeHeroSlides.length])

    const goPrevHero = useCallback(() => {
        if (safeHeroSlides.length <= 1) return
        setCurrentAdIndex((prev) => (prev - 1 + safeHeroSlides.length) % safeHeroSlides.length)
    }, [safeHeroSlides.length])

    const goNextHero = useCallback(() => {
        if (safeHeroSlides.length <= 1) return
        setCurrentAdIndex((prev) => (prev + 1) % safeHeroSlides.length)
    }, [safeHeroSlides.length])

    // Swipe tactile mobile
    const [touchStartX, setTouchStartX] = useState<number | null>(null)
    const handleHeroTouchStart = useCallback((e: React.TouchEvent) => {
        setTouchStartX(e.touches[0].clientX)
    }, [])
    const handleHeroTouchEnd = useCallback(
        (e: React.TouchEvent) => {
            if (touchStartX === null) return
            const dx = e.changedTouches[0].clientX - touchStartX
            if (Math.abs(dx) > 40) {
                if (dx < 0) goNextHero()
                else goPrevHero()
            }
            setTouchStartX(null)
        },
        [touchStartX, goNextHero, goPrevHero]
    )

    return (
        <div className="bg-white pb-28 pt-0 dark:bg-neutral-950">
            <VendorMarketDrawer open={vendorDrawerOpen} onClose={() => setVendorDrawerOpen(false)} />
            {/* Hero : ~80 % de largeur (–20 % vs plein écran), centré */}
            <section className="w-full overflow-x-clip overflow-y-hidden bg-white py-4 dark:bg-neutral-950 sm:py-6">
                {safeHeroSlides.length > 0 ? (
                    <>
                        {/* Note : le <link rel="preload"> du premier slide est rendu en
                            server component dans app/(public)/page.tsx pour être présent
                            dans le HTML initial (sinon React 19 le hoiste trop tard et
                            l'image LCP démarre avec ~1.8s de retard sur PageSpeed). */}
                        {/* Hauteur ×0,8 vs avant (largeur inchangée) */}
                        <div
                            className="relative mx-auto h-[min(70.4vh,656px)] w-[90%] min-w-0 max-w-[1400px] overflow-hidden rounded-2xl bg-[#ebe8e2] sm:w-[80%] dark:bg-neutral-900"
                            onTouchStart={handleHeroTouchStart}
                            onTouchEnd={handleHeroTouchEnd}
                        >
                            {safeHeroSlides.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={goPrevHero}
                                        aria-label="Bannière précédente"
                                        className="absolute left-3 top-1/2 z-20 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-neutral-900 shadow-md backdrop-blur transition hover:bg-white sm:left-5 sm:h-12 sm:w-12 dark:bg-neutral-900/70 dark:text-white dark:hover:bg-neutral-900"
                                    >
                                        <ChevronLeft size={22} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={goNextHero}
                                        aria-label="Bannière suivante"
                                        className="absolute right-3 top-1/2 z-20 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-neutral-900 shadow-md backdrop-blur transition hover:bg-white sm:right-5 sm:h-12 sm:w-12 dark:bg-neutral-900/70 dark:text-white dark:hover:bg-neutral-900"
                                    >
                                        <ChevronRight size={22} />
                                    </button>
                                </>
                            )}
                            {safeHeroSlides.map((slide, index) => {
                                const active = index === currentAdIndex
                                return (
                                    <div
                                        key={slide.id}
                                        className={`absolute inset-0 flex flex-col transition-opacity duration-500 ease-out md:flex-row ${
                                            active ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0'
                                        }`}
                                        aria-hidden={!active}
                                    >
                                        <Link
                                            href={slide.link_url || '/search'}
                                            className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden md:flex-row"
                                        >
                                            <div className="flex min-h-0 w-full shrink-0 flex-col justify-center px-8 py-10 md:w-[46%] md:max-w-xl md:py-16 md:pl-12 md:pr-8 lg:pl-20 lg:pr-12">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-neutral-500">
                                                    {slide.source === 'campaign' ? 'Sponsorisé' : 'Collection'}
                                                </p>
                                                <h2 className="mt-5 text-4xl font-light leading-[1.1] tracking-tight text-neutral-900 dark:text-white md:text-5xl lg:text-[3.25rem]">
                                                    {slide.title}
                                                </h2>
                                                {slide.subtitle ? (
                                                    <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                                                        {slide.subtitle}
                                                    </p>
                                                ) : null}
                                                <span className="mt-10 inline-flex w-fit items-center border border-neutral-900 bg-neutral-900 px-10 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white hover:text-neutral-900 dark:border-white dark:bg-white dark:text-neutral-900 dark:hover:bg-transparent dark:hover:text-white">
                                                    Shop Now
                                                </span>
                                            </div>
                                            <div className="relative min-h-[min(33.6vh,304px)] w-full min-w-0 flex-1 overflow-hidden md:min-h-0">
                                                {/* Cadre fixe : l’image ne dépasse pas (cover + clip) */}
                                                <img
                                                    src={heroImageUrl(slide.img, 960) || '/placeholder-image.svg'}
                                                    srcSet={slide.img ? heroImageSrcSet(slide.img) : undefined}
                                                    alt={slide.title}
                                                    className="absolute inset-0 box-border h-full w-full max-w-full object-cover object-center"
                                                    loading={index === 0 ? 'eager' : 'lazy'}
                                                    fetchPriority={index === 0 ? 'high' : 'low'}
                                                    decoding="async"
                                                    sizes="(max-width: 768px) 100vw, 54vw"
                                                />
                                            </div>
                                        </Link>
                                    </div>
                                )
                            })}
                        </div>
                        {safeHeroSlides.length > 1 && (
                            <div className="mx-auto flex w-[90%] min-w-0 max-w-[1400px] justify-center gap-2 pb-8 pt-2 sm:w-[80%]">
                                {safeHeroSlides.map((_, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        aria-label={`Bannière ${i + 1}`}
                                        aria-current={i === currentAdIndex}
                                        onClick={() => setCurrentAdIndex(i)}
                                        className={`h-1.5 rounded-full transition-all ${
                                            i === currentAdIndex ? 'w-8 bg-neutral-800 dark:bg-white' : 'w-1.5 bg-neutral-400/80'
                                        }`}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="mx-auto flex min-h-[56vh] w-[90%] min-w-0 max-w-[1400px] flex-col items-center justify-center rounded-2xl bg-[#ebe8e2] px-6 py-20 sm:w-[80%] dark:bg-neutral-900">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-neutral-500">Mayombe Market</p>
                        <h2 className="mt-4 text-center text-3xl font-light text-neutral-900 dark:text-white md:text-5xl">
                            Découvrez le catalogue
                        </h2>
                        <Link
                            href="/search"
                            className="mt-10 border border-neutral-900 bg-neutral-900 px-10 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white hover:text-neutral-900 dark:border-white dark:bg-white dark:text-neutral-900"
                        >
                            Shop Now
                        </Link>
                    </div>
                )}
            </section>

            <div className="mx-auto max-w-[1320px] space-y-24 px-5 pt-10 sm:px-8 lg:px-10 lg:pt-14">
                {/* Sous le hero : livraison | Vendeurs | Retours & Litiges */}
                <section className="overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-800">
                    <div className="grid gap-0 bg-neutral-50/80 md:grid-cols-3 dark:bg-neutral-900/50">
                        <div className="flex items-center gap-5 border-b border-neutral-200/80 px-6 py-6 md:border-b-0 md:border-r dark:border-neutral-800">
                            <Truck className="h-6 w-6 shrink-0 text-neutral-700 dark:text-neutral-300" strokeWidth={1.25} />
                            <div>
                                <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">Livraison</p>
                                <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">Brazzaville & Pointe-Noire</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setVendorDrawerOpen(true)}
                            className="flex w-full items-center justify-between gap-4 border-b border-neutral-200/80 px-6 py-6 text-left transition hover:bg-white md:border-b-0 md:border-r dark:border-neutral-800 dark:hover:bg-neutral-800/80"
                        >
                            <div className="flex items-center gap-5">
                                <Store className="h-6 w-6 shrink-0 text-neutral-700 dark:text-neutral-300" strokeWidth={1.25} />
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">Vendeurs</p>
                                    <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">Ouvrir une boutique</p>
                                </div>
                            </div>
                            <ArrowRight className="h-5 w-5 shrink-0 text-neutral-400" />
                        </button>
                        <Link
                            href="/retours-litiges"
                            className="flex w-full items-center justify-between gap-4 bg-orange-50/60 px-6 py-6 transition hover:bg-orange-50 dark:bg-orange-950/20 dark:hover:bg-orange-950/40 no-underline"
                        >
                            <div className="flex items-center gap-5">
                                <PackageX className="h-6 w-6 shrink-0 text-orange-500" strokeWidth={1.25} />
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-orange-500">Retours & Litiges</p>
                                    <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">Signaler un problème</p>
                                </div>
                            </div>
                            <ArrowRight className="h-5 w-5 shrink-0 text-orange-400" />
                        </Link>
                    </div>
                </section>

                {/* Compteurs produits & boutiques */}
                {(totalProducts > 0 || totalVendors > 0) && (
                    <section className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
                        <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 px-5 py-6 text-center dark:border-neutral-800 dark:bg-neutral-900/50">
                            <p className="text-2xl font-black tracking-tight text-orange-500 md:text-3xl">{totalProducts.toLocaleString('fr-FR')}+</p>
                            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Produits</p>
                        </div>
                        <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 px-5 py-6 text-center dark:border-neutral-800 dark:bg-neutral-900/50">
                            <p className="text-2xl font-black tracking-tight text-orange-500 md:text-3xl">{totalVendors.toLocaleString('fr-FR')}+</p>
                            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Boutiques</p>
                        </div>
                        <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 px-5 py-6 text-center dark:border-neutral-800 dark:bg-neutral-900/50">
                            <p className="text-2xl font-black tracking-tight text-orange-500 md:text-3xl">2</p>
                            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Villes</p>
                        </div>
                        <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 px-5 py-6 text-center dark:border-neutral-800 dark:bg-neutral-900/50">
                            <p className="text-2xl font-black tracking-tight text-orange-500 md:text-3xl">24/7</p>
                            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Disponible</p>
                        </div>
                    </section>
                )}

                {/* Sélection — grille 4 (Sophie : featured) + bandeau confiance */}
                {trendsList.length > 0 && (
                    <section>
                        <SophieSectionTitle
                            label="Tendances"
                            title={hasActivePromo ? 'Sélection du moment' : 'Coup de cœur'}
                        />
                        {safeTileCampaigns.length > 0 ? (
                            <PubProductMixSlider products={trendsList} tileCampaigns={safeTileCampaigns} />
                        ) : (
                            <TrendsProductSlider products={trendsList} />
                        )}
                        <div className="mt-12 sm:mt-14">
                            <TrustMarquee />
                        </div>
                    </section>
                )}

                {/* Deux tuiles (campagnes puis catégories) + rangée horizontale de campagnes tuile */}
                {(fixedTileLeft || fixedTileRight || scrollTileCampaigns.length > 0) && (
                    <section>
                        {(fixedTileLeft || fixedTileRight) && (
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                                {[fixedTileLeft, fixedTileRight].filter(Boolean).map((slot) => {
                                    if (slot && 'image_url' in slot) {
                                        const c = slot as TileCampaign
                                        return (
                                            <Link
                                                key={`vtile-${c.id}`}
                                                href={c.link_url}
                                                className="group relative aspect-[4/3] overflow-hidden bg-neutral-200 md:aspect-[16/10]"
                                            >
                                                <img
                                                    src={heroImageUrl(c.image_url, 700) || '/placeholder-image.svg'}
                                                    alt={c.title || 'Sponsorisé'}
                                                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                                                    loading="lazy"
                                                    decoding="async"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
                                                <div className="absolute inset-0 flex flex-col items-center justify-end p-10 pb-12 text-center text-white">
                                                    <p className="text-[10px] font-semibold uppercase tracking-[0.35em] opacity-80">
                                                        Sponsorisé
                                                    </p>
                                                    <h3 className="mt-2 text-3xl font-light tracking-wide md:text-4xl">
                                                        {c.title || 'À découvrir'}
                                                    </h3>
                                                    {c.description ? (
                                                        <p className="mt-2 line-clamp-2 max-w-sm text-sm text-white/90">
                                                            {c.description}
                                                        </p>
                                                    ) : null}
                                                    <span className="mt-4 text-[11px] font-semibold uppercase tracking-[0.35em] opacity-90">
                                                        Découvrir →
                                                    </span>
                                                </div>
                                            </Link>
                                        )
                                    }
                                    const cat = slot as { id: string; name: string; img?: string | null }
                                    return (
                                        <Link
                                            key={cat.id}
                                            href={`/category/${encodeURIComponent(cat.name)}`}
                                            className="group relative aspect-[4/3] overflow-hidden bg-neutral-200 md:aspect-[16/10]"
                                        >
                                            <img
                                                src={heroImageUrl(
                                                    cat.img ||
                                                    'https://images.unsplash.com/photo-1506484334402-40f215037b27?q=80&w=1200',
                                                    700,
                                                )}
                                                alt={cat.name}
                                                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                                                loading="lazy"
                                                decoding="async"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
                                            <div className="absolute inset-0 flex flex-col items-center justify-end p-10 pb-12 text-center text-white">
                                                <h3 className="text-3xl font-light tracking-wide md:text-4xl">{cat.name}</h3>
                                                <span className="mt-4 text-[11px] font-semibold uppercase tracking-[0.35em] opacity-90">
                                                    Voir la collection →
                                                </span>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        )}
                        {scrollTileCampaigns.length > 0 && (
                            <div className="mt-6 flex gap-4 overflow-x-auto pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
                                {scrollTileCampaigns.map((c) => (
                                    <Link
                                        key={`vtile-scroll-${c.id}`}
                                        href={c.link_url}
                                        className="group relative aspect-[4/3] w-[min(85vw,320px)] shrink-0 snap-start overflow-hidden rounded-2xl bg-neutral-200 md:aspect-[16/10] md:w-[min(42vw,400px)]"
                                    >
                                        <img
                                            src={heroImageUrl(c.image_url, 700) || '/placeholder-image.svg'}
                                            alt={c.title || 'Sponsorisé'}
                                            className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
                                        <div className="absolute inset-0 flex flex-col items-center justify-end p-8 pb-10 text-center text-white">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] opacity-80">
                                                Sponsorisé
                                            </p>
                                            <h3 className="mt-2 line-clamp-2 text-2xl font-light tracking-wide">
                                                {c.title || 'À découvrir'}
                                            </h3>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* Avis clients */}
                {homeReviews.length > 0 && (
                    <section className="border-t border-neutral-200/70 pt-20 dark:border-neutral-800 [content-visibility:auto] [contain-intrinsic-size:auto_600px]">
                        <SophieSectionTitle label="Témoignages" title="Ce que disent nos clients" />
                        {/* Scroll horizontal sur mobile, grille 3 colonnes sur desktop */}
                        <div className="flex gap-5 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
                            {homeReviews.map((review) => {
                                const product = review.products as any
                                const stars = Math.round(review.rating ?? 5)
                                const text = (review.content || '').slice(0, 160)
                                const hasMore = (review.content || '').length > 160
                                return (
                                    <div
                                        key={review.id}
                                        className="flex w-[min(80vw,320px)] shrink-0 flex-col justify-between border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950 md:w-auto"
                                    >
                                        {/* Étoiles */}
                                        <div className="mb-4 flex gap-0.5">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <span key={i} className={i < stars ? 'text-amber-400' : 'text-neutral-200 dark:text-neutral-700'}>
                                                    ★
                                                </span>
                                            ))}
                                        </div>

                                        {/* Texte */}
                                        <p className="flex-1 text-sm font-light leading-relaxed text-neutral-700 dark:text-neutral-300">
                                            &ldquo;{text}{hasMore ? '…' : ''}&rdquo;
                                        </p>

                                        {/* Produit + auteur */}
                                        <div className="mt-5 flex items-center gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                                            {product?.img ? (
                                                <img
                                                    src={product.img}
                                                    alt={product.name}
                                                    className="h-10 w-10 flex-shrink-0 object-cover"
                                                    loading="lazy"
                                                />
                                            ) : null}
                                            <div className="min-w-0">
                                                <p className="truncate text-[11px] font-semibold text-neutral-900 dark:text-white">
                                                    {review.user_name || 'Client'}
                                                </p>
                                                {product?.name ? (
                                                    <p className="truncate text-[10px] text-neutral-400">
                                                        {product.name}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )}

                {/* Nouveautés — grille 5 */}
                {displayedNewProducts.length > 0 && (
                    <section className="border-t border-neutral-200/70 pt-20 dark:border-neutral-800 [content-visibility:auto] [contain-intrinsic-size:auto_900px]">
                        <SophieSectionTitle label="Nouveautés" title="Dernières arrivées" />
                        <div className="grid grid-flow-dense grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 md:grid-cols-5 md:gap-x-4 md:gap-y-12">
                            {displayedNewProducts.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    aboveFold={false}
                                />
                            ))}
                        </div>
                        {hasMoreNewProducts && (
                            <div className="mt-10 text-center">
                                <button
                                    onClick={loadMoreNewProducts}
                                    disabled={loadingMore}
                                    className="inline-flex items-center gap-2 bg-orange-500 text-white px-10 py-4 rounded-full text-sm font-black uppercase tracking-wider hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 active:scale-[0.97]"
                                >
                                    {loadingMore ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Chargement…
                                        </>
                                    ) : (
                                        <>
                                            Afficher plus
                                            <span className="text-lg leading-none">↓</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </section>
                )}

                {/* Blocs confiance premium */}
                <section className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                    <div className="border border-neutral-200 bg-white px-8 py-12 dark:border-neutral-800 dark:bg-neutral-950">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-neutral-400">
                            Communaute
                        </p>
                        <h3 className="mt-3 text-2xl font-light text-neutral-900 dark:text-white">
                            Plus qu&apos;un marche, une communaute
                        </h3>
                        <p className="mt-5 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                            Des milliers de Congolais nous font confiance pour acheter et vendre chaque jour. Chaque commande soutient un entrepreneur local.
                        </p>
                    </div>
                    <div className="flex flex-col justify-center bg-neutral-900 px-8 py-12 text-center text-white md:px-12">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/60">Simple</p>
                        <p className="mt-4 text-xl font-light leading-snug md:text-2xl">
                            Trouve. Commande. Livre.
                        </p>
                        <p className="mx-auto mt-4 max-w-xs text-sm text-white/50">
                            En 3 clics, recevez vos articles chez vous a Brazzaville ou Pointe-Noire.
                        </p>
                    </div>
                </section>

                {/* Trois zones : produits hors tendances (côtés) + visuel confiance (centre, plus large) */}
                {sideHighlightPair && (
                    <section
                        className="border-t border-neutral-200/70 pt-20 dark:border-neutral-800"
                        aria-labelledby="triptych-reassurance-heading"
                    >
                        <h2 id="triptych-reassurance-heading" className="sr-only">
                            Pour acheter en toute confiance
                        </h2>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-12 md:gap-6 md:items-stretch">
                            <Link
                                href={`/product/${sideHighlightPair[0].id}`}
                                className="group relative aspect-[4/5] min-h-0 overflow-hidden rounded-2xl bg-neutral-100 md:col-span-3 dark:bg-neutral-900"
                            >
                                <img
                                    src={sideProductImageUrl(sideHighlightPair[0])}
                                    alt={sideHighlightPair[0].name ? String(sideHighlightPair[0].name) : ''}
                                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                                    loading="lazy"
                                    decoding="async"
                                    sizes="(max-width:768px) 100vw, 25vw"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                <p className="absolute bottom-4 left-4 right-4 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white/90">
                                    Sélection
                                </p>
                            </Link>

                            <div className="relative min-h-[280px] overflow-hidden rounded-2xl bg-neutral-200 md:col-span-6 md:min-h-[min(420px,52vh)]">
                                <img
                                    src={heroImageUrl(REASSURANCE_HERO_IMAGE, 1000)}
                                    alt=""
                                    className="absolute inset-0 h-full w-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                    sizes="(max-width:768px) 100vw, 50vw"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                                <div className="absolute inset-0 flex flex-col items-center justify-end p-8 pb-10 text-center text-white md:p-12 md:pb-14">
                                    <ShieldCheck
                                        className="mb-4 h-10 w-10 text-white/95 md:h-12 md:w-12"
                                        strokeWidth={1.25}
                                        aria-hidden
                                    />
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/85">
                                        Votre tranquillité
                                    </p>
                                    <p className="mt-3 max-w-lg text-lg font-light leading-snug md:text-xl">
                                        Paiement Mobile Money ou cash · Vendeurs accompagnés · Livraison soignée sur
                                        Brazzaville & Pointe-Noire
                                    </p>
                                </div>
                            </div>

                            <Link
                                href={`/product/${sideHighlightPair[1].id}`}
                                className="group relative aspect-[4/5] min-h-0 overflow-hidden rounded-2xl bg-neutral-100 md:col-span-3 dark:bg-neutral-900"
                            >
                                <img
                                    src={sideProductImageUrl(sideHighlightPair[1])}
                                    alt={sideHighlightPair[1].name ? String(sideHighlightPair[1].name) : ''}
                                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                                    loading="lazy"
                                    decoding="async"
                                    sizes="(max-width:768px) 100vw, 25vw"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                <p className="absolute bottom-4 left-4 right-4 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white/90">
                                    Sélection
                                </p>
                            </Link>
                        </div>
                    </section>
                )}

                {/* Mise en avant asymétrique */}
                {asymmetricPair && (
                    <section className="border-t border-neutral-200/70 pt-20 dark:border-neutral-800">
                        <SophieSectionTitle label="Focus" title="En lumière" />
                        <div className="grid grid-flow-dense grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
                            <div className="md:col-span-2">
                                <ProductCard product={asymmetricPair[0]} aboveFold={false} />
                            </div>
                            <div className="md:col-span-1">
                                <ProductCard product={asymmetricPair[1]} aboveFold={false} />
                            </div>
                        </div>
                    </section>
                )}

                {/* Autres catégories */}
                {categoryRest.length > 0 && (
                    <section className="[content-visibility:auto] [contain-intrinsic-size:auto_1400px]">
                        <SophieSectionTitle label="Explorer" title="Autres univers" />
                        <div className="grid gap-6 md:grid-cols-3 md:gap-8">
                            {categoryRest.map((cat, catIndex) => (
                                <div
                                    key={cat.id}
                                    className="group relative h-72 overflow-hidden border border-neutral-200/80 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900"
                                >
                                    <Link href={`/category/${encodeURIComponent(cat.name)}`} className="absolute inset-0 z-0">
                                        <img
                                            src={heroImageUrl(
                                                cat.img ||
                                                'https://images.unsplash.com/photo-1506484334402-40f215037b27?q=80&w=800',
                                                600,
                                            )}
                                            alt={cat.name}
                                            className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                                            loading={catIndex === 0 ? 'eager' : 'lazy'}
                                            decoding="async"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                                    </Link>
                                    <div className="absolute bottom-0 z-10 w-full p-6 text-white">
                                        <h3 className="text-lg font-light">{cat.name}</h3>
                                        <Link
                                            href={`/category/${encodeURIComponent(cat.name)}`}
                                            className="mt-2 inline-block text-[11px] font-semibold uppercase tracking-[0.2em] underline decoration-white/40 underline-offset-4"
                                        >
                                            Découvrir
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* Section avis plateforme */}
            <PlatformReviewsSection reviews={platformReviews} />
        </div>
    )
}

function PlatformReviewsSection({ reviews }: { reviews: PlatformReview[] }) {
    function initials(name?: string | null): string {
        if (!name) return '?'
        return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('')
    }

    function formatDate(iso: string): string {
        try {
            return new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
        } catch {
            return ''
        }
    }

    return (
        <section style={{ background: '#0C0A09', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="max-w-4xl mx-auto px-4 py-16">
                <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-center mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Avis vérifiés
                </p>
                <h2 className="text-2xl font-light text-center text-white mb-2 tracking-tight" style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}>
                    Ce que nos clients pensent de Mayombe Market
                </h2>
                <p className="text-center text-xs mb-10" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Avis laissés après un achat confirmé sur la plateforme
                </p>

                {reviews.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            Soyez le premier à partager votre expérience !
                        </p>
                        <a
                            href="/avis-mayombe-market"
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all hover:border-white/20"
                            style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.05)' }}
                        >
                            Laisser un avis →
                        </a>
                    </div>
                ) : (
                    <>
                        {/* Carousel mobile : scroll horizontal, snap */}
                        <div
                            className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3"
                        >
                            {reviews.map((r) => {
                                const profileData = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
                                const name = profileData?.full_name || 'Client'
                                const stars = Math.min(5, Math.max(1, Math.round(r.platform_rating)))
                                const text = (r.comment || '').slice(0, 180)
                                const hasMore = (r.comment || '').length > 180
                                return (
                                    <div
                                        key={r.id}
                                        className="rounded-2xl p-5 border flex flex-col gap-3 snap-start flex-shrink-0 w-[min(80vw,280px)] sm:w-auto"
                                        style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}
                                    >
                                        {/* Étoiles + badge */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-amber-400 text-sm tracking-tight">
                                                {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
                                            </span>
                                            <span
                                                className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                                                style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}
                                            >
                                                Achat vérifié
                                            </span>
                                        </div>

                                        {/* Commentaire */}
                                        <p className="text-sm leading-relaxed flex-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
                                            &ldquo;{text}{hasMore ? '…' : ''}&rdquo;
                                        </p>

                                        {/* Avatar + nom + date */}
                                        <div className="flex items-center gap-3 mt-auto pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                                                style={{ background: 'rgba(249,115,22,0.2)', color: '#f97316' }}
                                            >
                                                {initials(name)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-white truncate">{name}</p>
                                                <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                                    {formatDate(r.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="text-center mt-10">
                            <a
                                href="/avis-mayombe-market"
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all hover:border-white/20"
                                style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)' }}
                            >
                                Voir tous les avis →
                            </a>
                        </div>
                    </>
                )}
            </div>
        </section>
    )
}
