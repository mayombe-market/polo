'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import ProductCard from '@/app/components/ProductCard'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import VendorMarketDrawer from '@/app/components/VendorMarketDrawer'
import TrustMarquee from '@/app/components/TrustMarquee'
import TrendsProductSlider from '@/app/components/TrendsProductSlider'
import PubProductMixSlider from '@/app/components/PubProductMixSlider'
import { Truck, Store, ArrowRight, ShieldCheck } from 'lucide-react'
import type { UnifiedHeroSlide } from '@/lib/mergeHeroSlides'
import { normalizeProductImageUrl } from '@/lib/resolveProductImageUrl'

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

interface ClientHomePageProps {
    heroSlides: UnifiedHeroSlide[]
    tileCampaigns: TileCampaign[]
    topProducts: any[]
    categories: any[]
    newProducts: any[]
    popularProducts: any[]
    promoProducts: any[]
    trendProducts: any[]
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
    topProducts,
    categories,
    newProducts,
    popularProducts,
    promoProducts,
    trendProducts,
}: ClientHomePageProps) {
    const [currentAdIndex, setCurrentAdIndex] = useState(0)
    const [newsletterEmail, setNewsletterEmail] = useState('')
    const [newsletterOk, setNewsletterOk] = useState(false)
    const [vendorDrawerOpen, setVendorDrawerOpen] = useState(false)

    // Load-more nouveautés
    const [displayedNewProducts, setDisplayedNewProducts] = useState<any[]>(() => newProducts.slice(0, 20))
    const [newProductsOffset, setNewProductsOffset] = useState(newProducts.length)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMoreNewProducts, setHasMoreNewProducts] = useState(newProducts.length >= 20)

    const loadMoreNewProducts = useCallback(async () => {
        setLoadingMore(true)
        try {
            const supabase = getSupabaseBrowserClient()
            const { data, error } = await supabase
                .from('products')
                .select('id, name, price, img, images_gallery, category, stock_quantity, seller_id, promo_percentage, promo_start_date, promo_end_date')
                .neq('category', 'Immobilier')
                .order('created_at', { ascending: false })
                .range(newProductsOffset, newProductsOffset + 19)

            if (error) {
                console.error('[loadMore] Erreur:', error.message)
                return
            }

            const moreProducts = data || []
            if (moreProducts.length > 0) {
                setDisplayedNewProducts(prev => [...prev, ...moreProducts])
                setNewProductsOffset(prev => prev + moreProducts.length)
            }
            if (moreProducts.length < 20) {
                setHasMoreNewProducts(false)
            }
        } catch (err) {
            console.error('[loadMore] Erreur:', err)
        } finally {
            setLoadingMore(false)
        }
    }, [newProductsOffset])

    const safeHeroSlides = useMemo(() => (Array.isArray(heroSlides) ? heroSlides : []), [heroSlides])
    const safeTileCampaigns = useMemo(
        () => (Array.isArray(tileCampaigns) ? tileCampaigns : []),
        [tileCampaigns]
    )
    const safeCategories = useMemo(() => (Array.isArray(categories) ? categories : []), [categories])

    const trendsList = Array.isArray(trendProducts) ? trendProducts.slice(0, 30) : []

    /** Deux produits (hors tendances si possible) pour le triptyque — IDs normalisés en string (UUID Supabase). */
    const sideHighlightPair = useMemo(() => {
        const trendIds = new Set(
            trendsList
                .map((p: { id?: unknown }) => (p?.id != null && p.id !== '' ? String(p.id) : null))
                .filter((x): x is string => x != null),
        )
        const pool: any[] = [
            ...(Array.isArray(popularProducts) ? popularProducts : []),
            ...(Array.isArray(newProducts) ? newProducts : []),
            ...(Array.isArray(promoProducts) ? promoProducts : []),
            ...(Array.isArray(topProducts) ? topProducts : []),
        ]
        const out: any[] = []
        const seen = new Set<string>()
        for (const p of pool) {
            const id = p?.id != null && p.id !== '' ? String(p.id) : ''
            if (!id || seen.has(id) || trendIds.has(id)) continue
            seen.add(id)
            out.push(p)
            if (out.length >= 2) break
        }
        if (out.length < 2) {
            for (const p of pool) {
                const id = p?.id != null && p.id !== '' ? String(p.id) : ''
                if (!id || seen.has(id)) continue
                seen.add(id)
                out.push(p)
                if (out.length >= 2) break
            }
        }
        return out.length >= 2 ? ([out[0], out[1]] as const) : null
    }, [trendsList, popularProducts, newProducts, promoProducts, topProducts])

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

    const asymmetricPair =
        Array.isArray(topProducts) && topProducts.length >= 2 ? [topProducts[0], topProducts[1]] : null

    useEffect(() => {
        if (safeHeroSlides.length <= 1) return
        const interval = setInterval(() => {
            setCurrentAdIndex((prev) => (prev + 1) % safeHeroSlides.length)
        }, 6000)
        return () => clearInterval(interval)
    }, [safeHeroSlides.length])

    const onNewsletterSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (newsletterEmail.includes('@')) {
            setNewsletterOk(true)
            setNewsletterEmail('')
            setTimeout(() => setNewsletterOk(false), 4000)
        }
    }

    return (
        <div className="bg-white pb-28 pt-0 dark:bg-neutral-950">
            <VendorMarketDrawer open={vendorDrawerOpen} onClose={() => setVendorDrawerOpen(false)} />
            {/* Hero : ~80 % de largeur (–20 % vs plein écran), centré */}
            <section className="w-full overflow-x-clip overflow-y-hidden bg-white py-4 dark:bg-neutral-950 sm:py-6">
                {safeHeroSlides.length > 0 ? (
                    <>
                        {/* Hauteur ×0,8 vs avant (largeur inchangée) */}
                        <div className="relative mx-auto h-[min(70.4vh,656px)] w-[90%] min-w-0 max-w-[1400px] overflow-hidden rounded-2xl bg-[#ebe8e2] sm:w-[80%] dark:bg-neutral-900">
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
                                                    src={slide.img || '/placeholder-image.svg'}
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
                {/* Sous le hero : livraison | Vendeurs (drawer boutiques + CTA) */}
                <section className="overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-800">
                    <div className="grid gap-0 bg-neutral-50/80 md:grid-cols-2 dark:bg-neutral-900/50">
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
                            className="flex w-full items-center justify-between gap-4 px-6 py-6 text-left transition hover:bg-white dark:hover:bg-neutral-800/80"
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
                    </div>
                </section>

                {/* Sélection — grille 4 (Sophie : featured) + bandeau confiance */}
                {trendsList.length > 0 && (
                    <section>
                        <SophieSectionTitle
                            label="Tendances"
                            title={promoProducts.length > 0 ? 'Sélection du moment' : 'Coup de cœur'}
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
                                                    src={c.image_url || '/placeholder-image.svg'}
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
                                                src={
                                                    cat.img ||
                                                    'https://images.unsplash.com/photo-1506484334402-40f215037b27?q=80&w=1200'
                                                }
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
                                            src={c.image_url || '/placeholder-image.svg'}
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

                {/* Nouveautés — grille 5 */}
                {displayedNewProducts.length > 0 && (
                    <section className="border-t border-neutral-200/70 pt-20 dark:border-neutral-800">
                        <SophieSectionTitle label="Nouveautés" title="Dernières arrivées" />
                        <div className="grid grid-flow-dense grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 md:grid-cols-5 md:gap-x-4 md:gap-y-12">
                            {displayedNewProducts.map((product, index) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    aboveFold={index < 8}
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

                {/* Newsletter + bandeau livraison (noir) */}
                <section className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                    <div className="border border-neutral-200 bg-white px-8 py-12 dark:border-neutral-800 dark:bg-neutral-950">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-neutral-400">
                            Newsletter
                        </p>
                        <h3 className="mt-3 text-2xl font-light text-neutral-900 dark:text-white">Restez informé</h3>
                        {newsletterOk ? (
                            <p className="mt-6 text-sm text-neutral-600 dark:text-neutral-400">Merci — à très bientôt.</p>
                        ) : (
                            <form onSubmit={onNewsletterSubmit} className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end">
                                <label className="sr-only" htmlFor="home-newsletter-email">
                                    E-mail
                                </label>
                                <input
                                    id="home-newsletter-email"
                                    type="email"
                                    value={newsletterEmail}
                                    onChange={(e) => setNewsletterEmail(e.target.value)}
                                    placeholder="votre@email.com"
                                    className="min-h-12 flex-1 border-b border-neutral-300 bg-transparent px-0 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-600 dark:text-white dark:focus:border-white"
                                />
                                <button
                                    type="submit"
                                    className="min-h-12 shrink-0 border border-neutral-900 bg-neutral-900 px-8 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white hover:text-neutral-900 dark:border-white dark:bg-white dark:text-neutral-900 dark:hover:bg-transparent dark:hover:text-white"
                                >
                                    S&apos;inscrire
                                </button>
                            </form>
                        )}
                    </div>
                    <div className="flex flex-col justify-center bg-neutral-900 px-8 py-12 text-center text-white md:px-12">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/60">Avantage</p>
                        <p className="mt-4 text-xl font-light leading-snug md:text-2xl">
                            Livraison soignée sur Brazzaville & Pointe-Noire
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
                                    src={REASSURANCE_HERO_IMAGE}
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
                                <ProductCard product={asymmetricPair[0]} aboveFold />
                            </div>
                            <div className="md:col-span-1">
                                <ProductCard product={asymmetricPair[1]} aboveFold={false} />
                            </div>
                        </div>
                    </section>
                )}

                {/* Autres catégories */}
                {categoryRest.length > 0 && (
                    <section>
                        <SophieSectionTitle label="Explorer" title="Autres univers" />
                        <div className="grid gap-6 md:grid-cols-3 md:gap-8">
                            {categoryRest.map((cat, catIndex) => (
                                <div
                                    key={cat.id}
                                    className="group relative h-72 overflow-hidden border border-neutral-200/80 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900"
                                >
                                    <Link href={`/category/${encodeURIComponent(cat.name)}`} className="absolute inset-0 z-0">
                                        <img
                                            src={
                                                cat.img ||
                                                'https://images.unsplash.com/photo-1506484334402-40f215037b27?q=80&w=800'
                                            }
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
        </div>
    )
}
