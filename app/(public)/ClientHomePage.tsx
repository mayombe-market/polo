'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import ProductCard from '@/app/components/ProductCard'
import ShopStoriesRow from '@/app/components/ShopStoriesRow'
import { Truck, Store, ArrowRight } from 'lucide-react'

interface ClientHomePageProps {
    ads: any[]
    topProducts: any[]
    categories: any[]
    newProducts: any[]
    popularProducts: any[]
    promoProducts: any[]
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
    ads,
    topProducts,
    categories,
    newProducts,
    popularProducts,
    promoProducts,
}: ClientHomePageProps) {
    const [currentAdIndex, setCurrentAdIndex] = useState(0)
    const [newsletterEmail, setNewsletterEmail] = useState('')
    const [newsletterOk, setNewsletterOk] = useState(false)

    const safeAds = useMemo(() => (Array.isArray(ads) ? ads : []), [ads])
    const safeCategories = useMemo(() => (Array.isArray(categories) ? categories : []), [categories])

    const featuredProducts = promoProducts.length > 0 ? promoProducts.slice(0, 4) : popularProducts.slice(0, 4)
    const newProductsRow = newProducts.slice(0, 10)
    const categoryBanners = safeCategories.slice(0, 2)
    const categoryRest = safeCategories.slice(2)

    const asymmetricPair =
        Array.isArray(topProducts) && topProducts.length >= 2 ? [topProducts[0], topProducts[1]] : null

    useEffect(() => {
        if (safeAds.length <= 1) return
        const interval = setInterval(() => {
            setCurrentAdIndex((prev) => (prev + 1) % safeAds.length)
        }, 6000)
        return () => clearInterval(interval)
    }, [safeAds.length])

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
            {/* Hero : ~80 % de largeur (–20 % vs plein écran), centré */}
            <section className="w-full overflow-x-clip overflow-y-hidden bg-white py-4 dark:bg-neutral-950 sm:py-6">
                {safeAds.length > 0 ? (
                    <>
                        {/* Hauteur ×0,8 vs avant (largeur inchangée) */}
                        <div className="relative mx-auto h-[min(70.4vh,656px)] w-[90%] min-w-0 max-w-[1400px] overflow-hidden rounded-2xl bg-[#ebe8e2] sm:w-[80%] dark:bg-neutral-900">
                            {safeAds.map((ad, index) => {
                                const active = index === currentAdIndex
                                return (
                                    <div
                                        key={ad.id}
                                        className={`absolute inset-0 flex flex-col transition-opacity duration-500 ease-out md:flex-row ${
                                            active ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0'
                                        }`}
                                        aria-hidden={!active}
                                    >
                                        <Link
                                            href={(ad.link_url as string) || '/search'}
                                            className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden md:flex-row"
                                        >
                                            <div className="flex min-h-0 w-full shrink-0 flex-col justify-center px-8 py-10 md:w-[46%] md:max-w-xl md:py-16 md:pl-12 md:pr-8 lg:pl-20 lg:pr-12">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-neutral-500">
                                                    Collection
                                                </p>
                                                <h2 className="mt-5 text-4xl font-light leading-[1.1] tracking-tight text-neutral-900 dark:text-white md:text-5xl lg:text-[3.25rem]">
                                                    {ad.title ? String(ad.title) : 'Nouvelle sélection'}
                                                </h2>
                                                <span className="mt-10 inline-flex w-fit items-center border border-neutral-900 bg-neutral-900 px-10 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white hover:text-neutral-900 dark:border-white dark:bg-white dark:text-neutral-900 dark:hover:bg-transparent dark:hover:text-white">
                                                    Shop Now
                                                </span>
                                            </div>
                                            <div className="relative min-h-[min(33.6vh,304px)] w-full min-w-0 flex-1 overflow-hidden md:min-h-0">
                                                {/* Cadre fixe : l’image ne dépasse pas (cover + clip) */}
                                                <img
                                                    src={ad.img || '/placeholder-image.svg'}
                                                    alt={ad.title ? String(ad.title) : 'Bannière'}
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
                        {safeAds.length > 1 && (
                            <div className="mx-auto flex w-[90%] min-w-0 max-w-[1400px] justify-center gap-2 pb-8 pt-2 sm:w-[80%]">
                                {safeAds.map((_, i) => (
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
                {/* Sous le hero : stories vendeurs + livraison / ouvrir une boutique (un seul bloc) */}
                <section className="overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-800">
                    <ShopStoriesRow embedded />
                    <div className="grid gap-0 bg-neutral-50/80 md:grid-cols-2 dark:bg-neutral-900/50">
                    <div className="flex items-center gap-5 border-b border-neutral-200/80 px-6 py-6 md:border-b-0 md:border-r dark:border-neutral-800">
                        <Truck className="h-6 w-6 shrink-0 text-neutral-700 dark:text-neutral-300" strokeWidth={1.25} />
                        <div>
                            <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">Livraison</p>
                            <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">Brazzaville & Pointe-Noire</p>
                        </div>
                    </div>
                    <Link href="/vendor/dashboard" className="flex items-center justify-between gap-4 px-6 py-6 transition hover:bg-white dark:hover:bg-neutral-800/80">
                        <div className="flex items-center gap-5">
                            <Store className="h-6 w-6 shrink-0 text-neutral-700 dark:text-neutral-300" strokeWidth={1.25} />
                            <div>
                                <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">Vendeurs</p>
                                <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">Ouvrir une boutique</p>
                            </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-neutral-400" />
                    </Link>
                    </div>
                </section>

                {/* Sélection — grille 4 (Sophie : featured) */}
                {featuredProducts.length > 0 && (
                    <section>
                        <SophieSectionTitle
                            label={promoProducts.length > 0 ? 'Offres' : 'À la une'}
                            title={promoProducts.length > 0 ? 'Sélection du moment' : 'Coup de cœur'}
                        />
                        <div className="grid grid-flow-dense grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4 md:gap-6 md:gap-y-14">
                            {featuredProducts.map((product: any, index: number) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    tone="editorial"
                                    aboveFold={index < 4}
                                />
                            ))}
                        </div>
                        <div className="mt-10 text-center">
                            <Link
                                href={promoProducts.length > 0 ? '/search?filter=promo' : '/search?sort=popular'}
                                className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500 underline decoration-neutral-300 underline-offset-8 transition hover:text-neutral-900 dark:hover:text-white"
                            >
                                Voir tout
                            </Link>
                        </div>
                    </section>
                )}

                {/* Deux grandes bannières catégories */}
                {categoryBanners.length > 0 && (
                    <section>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                            {categoryBanners.map((cat) => (
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
                                    <div className="absolute inset-0 flex flex-col items-center justify-end p-10 text-center text-white pb-12">
                                        <h3 className="text-3xl font-light tracking-wide md:text-4xl">{cat.name}</h3>
                                        <span className="mt-4 text-[11px] font-semibold uppercase tracking-[0.35em] opacity-90">
                                            Voir la collection →
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Nouveautés — grille 5 */}
                {newProductsRow.length > 0 && (
                    <section className="border-t border-neutral-200/70 pt-20 dark:border-neutral-800">
                        <SophieSectionTitle label="Nouveautés" title="Dernières arrivées" />
                        <div className="grid grid-flow-dense grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 md:grid-cols-5 md:gap-x-4 md:gap-y-12">
                            {newProductsRow.map((product, index) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    tone="editorial"
                                    aboveFold={index < 8}
                                />
                            ))}
                        </div>
                        <div className="mt-10 text-center">
                            <Link
                                href="/search?sort=newest"
                                className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500 underline decoration-neutral-300 underline-offset-8 transition hover:text-neutral-900 dark:hover:text-white"
                            >
                                Voir tout
                            </Link>
                        </div>
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

                {/* Mise en avant asymétrique */}
                {asymmetricPair && (
                    <section className="border-t border-neutral-200/70 pt-20 dark:border-neutral-800">
                        <SophieSectionTitle label="Focus" title="En lumière" />
                        <div className="grid grid-flow-dense grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
                            <div className="md:col-span-2">
                                <ProductCard product={asymmetricPair[0]} tone="editorial" aboveFold className="p-1" />
                            </div>
                            <div className="md:col-span-1">
                                <ProductCard product={asymmetricPair[1]} tone="editorial" aboveFold={false} className="p-1" />
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
