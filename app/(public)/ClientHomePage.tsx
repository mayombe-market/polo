'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import ProductCard from '@/app/components/ProductCard'
import { Truck, Store, ArrowRight } from 'lucide-react'

interface ClientHomePageProps {
    ads: any[]
    topProducts: any[]
    categories: any[]
    newProducts: any[]
    popularProducts: any[]
    promoProducts: any[]
}

function SectionHeading({
    eyebrow,
    title,
    subtitle,
    href,
    ctaLabel,
}: {
    eyebrow: string
    title: string
    subtitle?: string
    href?: string
    ctaLabel?: string
}) {
    return (
        <div className="mb-10 flex flex-col gap-4 sm:mb-14 md:flex-row md:items-end md:justify-between">
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-neutral-500">{eyebrow}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 md:text-3xl dark:text-white">
                    {title}
                </h2>
                {subtitle ? (
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{subtitle}</p>
                ) : null}
            </div>
            {href && ctaLabel ? (
                <Link
                    href={href}
                    className="inline-flex w-fit items-center gap-2 border-b border-neutral-900 pb-0.5 text-xs font-semibold uppercase tracking-widest text-neutral-900 transition hover:border-neutral-500 hover:text-neutral-600 dark:border-white dark:text-white dark:hover:border-neutral-300"
                >
                    {ctaLabel} <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                </Link>
            ) : null}
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
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    const safeAds = useMemo(() => (Array.isArray(ads) ? ads : []), [ads])

    const featuredProducts = promoProducts.length > 0 ? promoProducts.slice(0, 4) : popularProducts.slice(0, 4)

    const compactPopular =
        promoProducts.length > 0 ? popularProducts : popularProducts.slice(4, 8)

    const asymmetricPair =
        Array.isArray(topProducts) && topProducts.length >= 2 ? [topProducts[0], topProducts[1]] : null

    useEffect(() => {
        if (safeAds.length <= 1) return
        const interval = setInterval(() => {
            setCurrentAdIndex((prev) => (prev + 1) % safeAds.length)
        }, 5000)
        return () => clearInterval(interval)
    }, [safeAds.length])

    useEffect(() => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current
            const scrollWidth = container.scrollWidth / (safeAds.length || 1)
            container.scrollTo({ left: scrollWidth * currentAdIndex, behavior: 'smooth' })
        }
    }, [currentAdIndex, safeAds.length])

    return (
        <div className="pb-24 pt-0">
            {/* Hero plein écran — images = table `ads` (inchangé côté serveur) */}
            <section className="relative w-full overflow-hidden bg-neutral-100 dark:bg-neutral-950">
                {safeAds.length > 0 ? (
                    <div
                        ref={scrollContainerRef}
                        className="flex w-full snap-x snap-mandatory overflow-x-auto scrollbar-hide"
                        style={{ scrollbarWidth: 'none' }}
                    >
                        {safeAds.map((ad, index) => (
                            <Link
                                key={ad.id}
                                href={(ad.link_url as string) || '/search'}
                                className="relative block min-h-[72vh] w-full min-w-full shrink-0 snap-center overflow-hidden md:min-h-[78vh]"
                            >
                                <img
                                    src={ad.img || '/placeholder-image.svg'}
                                    alt={ad.title ? String(ad.title) : 'Bannière'}
                                    className="absolute inset-0 h-full w-full object-cover"
                                    loading={index === 0 ? 'eager' : index < 10 ? 'eager' : 'lazy'}
                                    fetchPriority={index === 0 ? 'high' : 'low'}
                                    decoding="async"
                                />
                                <div
                                    className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/25"
                                    aria-hidden
                                />
                                <div className="relative flex min-h-[72vh] flex-col justify-end px-6 py-12 md:min-h-[78vh] md:justify-center md:px-16 lg:px-24">
                                    <div className="max-w-2xl">
                                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80">
                                            Mayombe Market
                                        </p>
                                        <h2 className="text-4xl font-bold leading-[1.08] tracking-tight text-white md:text-5xl lg:text-6xl">
                                            {ad.title ? String(ad.title) : 'Nouvelle sélection'}
                                        </h2>
                                        <span className="mt-8 inline-flex w-fit items-center justify-center border border-white bg-white px-8 py-3.5 text-sm font-semibold tracking-wide text-neutral-900 transition hover:bg-neutral-100">
                                            Shop Now
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="relative flex min-h-[72vh] w-full flex-col items-center justify-center bg-neutral-900 px-6 md:min-h-[78vh]">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-700/50 via-neutral-900 to-neutral-950" />
                        <div className="relative text-center">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/70">Mayombe Market</p>
                            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-5xl">Découvrez le catalogue</h2>
                            <Link
                                href="/search"
                                className="mt-10 inline-flex items-center justify-center border border-white bg-white px-8 py-3.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
                            >
                                Shop Now
                            </Link>
                        </div>
                    </div>
                )}
            </section>

            <div className="mx-auto max-w-7xl space-y-20 px-4 pt-16 sm:px-6 lg:px-8 lg:pt-20">
                <section className="grid gap-4 md:grid-cols-2 md:gap-6">
                    <div className="flex items-center gap-6 rounded-2xl border border-neutral-200/80 bg-white p-8 text-neutral-900 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-white">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                            <Truck size={28} strokeWidth={1.5} className="text-neutral-700 dark:text-neutral-200" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-900 dark:text-white">
                                Livraison rapide
                            </h3>
                            <p className="mt-1 text-xs font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                                Brazzaville & Pointe-Noire
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/vendor/dashboard"
                        className="group flex items-center gap-6 rounded-2xl border border-neutral-200/80 bg-white p-8 text-neutral-900 shadow-sm transition hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:hover:border-neutral-600"
                    >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                            <Store size={28} strokeWidth={1.5} className="text-neutral-700 dark:text-neutral-200" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-900 dark:text-white">
                                Vendez sur Mayombe
                            </h3>
                            <p className="mt-1 text-xs font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                                Ouvrez votre boutique gratuitement
                            </p>
                        </div>
                        <ArrowRight
                            size={22}
                            strokeWidth={1.5}
                            className="shrink-0 text-neutral-400 transition group-hover:translate-x-1 group-hover:text-neutral-900 dark:group-hover:text-white"
                        />
                    </Link>
                </section>

                {newProducts.length > 0 && (
                    <section id="home-new">
                        <SectionHeading
                            eyebrow="Nouveautés"
                            title="Dernières arrivées"
                            subtitle="Sélection récente, présentation équilibrée."
                            href="/search?sort=newest"
                            ctaLabel="Voir tout"
                        />
                        <div className="grid grid-flow-dense grid-cols-2 gap-4 gap-y-10 md:grid-cols-4 md:gap-6 md:gap-y-12">
                            {newProducts.map((product, index) => (
                                <div key={product.id} className="min-w-0">
                                    <ProductCard product={product} aboveFold={index < 8} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {featuredProducts.length > 0 && (
                    <section
                        id="home-featured"
                        className="border-y border-neutral-200/80 py-16 dark:border-neutral-800"
                    >
                        <SectionHeading
                            eyebrow={promoProducts.length > 0 ? 'Offres' : 'Sélection'}
                            title={promoProducts.length > 0 ? 'Produits premium' : 'Coup de cœur'}
                            subtitle="Mise en avant large, rendu type catalogue haut de gamme."
                            href={promoProducts.length > 0 ? '/search?filter=promo' : '/search?sort=popular'}
                            ctaLabel="Voir tout"
                        />
                        <div className="grid grid-flow-dense grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8">
                            {featuredProducts.map((product: any, index: number) => (
                                <div key={product.id} className="min-w-0">
                                    <ProductCard
                                        product={product}
                                        aboveFold={index < 4}
                                        className="rounded-3xl p-4 shadow-sm md:p-5"
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {compactPopular.length > 0 && (
                    <section id="home-compact">
                        <SectionHeading
                            eyebrow="Boutique"
                            title="Tendances & accessoires"
                            subtitle="Format compact pour parcourir les best-sellers."
                            href="/search?sort=popular"
                            ctaLabel="Voir tout"
                        />
                        <div className="grid grid-flow-dense grid-cols-2 gap-3 gap-y-8 sm:grid-cols-3 md:grid-cols-5 md:gap-4 md:gap-y-10">
                            {compactPopular.map((product, index) => (
                                <div key={product.id} className="min-w-0">
                                    <ProductCard
                                        product={product}
                                        aboveFold={index < 10}
                                        className="rounded-2xl p-2 shadow-none md:p-2.5"
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {asymmetricPair && (
                    <section id="home-spotlight">
                        <SectionHeading
                            eyebrow="Focus"
                            title="Coup de projecteur"
                            subtitle="Basé sur le Top consultés (mêmes données `topProducts`)."
                        />
                        <div className="grid grid-flow-dense grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
                            <div className="md:col-span-2">
                                <ProductCard product={asymmetricPair[0]} aboveFold className="rounded-3xl p-4 md:p-6" />
                            </div>
                            <div className="md:col-span-1">
                                <ProductCard
                                    product={asymmetricPair[1]}
                                    aboveFold={false}
                                    className="h-full rounded-3xl p-3 md:p-4"
                                />
                            </div>
                        </div>
                    </section>
                )}

                <section>
                    <SectionHeading
                        eyebrow="Explorer"
                        title="Catégories"
                        subtitle="Parcourez les univers par thème."
                    />
                    <div className="grid gap-6 md:grid-cols-3 md:gap-8">
                        {categories?.map((cat, catIndex) => (
                            <div
                                key={cat.id}
                                className="group relative h-80 overflow-hidden rounded-3xl bg-neutral-200 shadow-sm dark:bg-neutral-800"
                            >
                                <Link href={`/category/${encodeURIComponent(cat.name)}`} className="absolute inset-0 z-0">
                                    <img
                                        src={
                                            cat.img ||
                                            'https://images.unsplash.com/photo-1506484334402-40f215037b27?q=80&w=800'
                                        }
                                        alt={cat.name}
                                        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                                        loading={catIndex === 0 ? 'eager' : catIndex < 10 ? 'eager' : 'lazy'}
                                        fetchPriority={catIndex === 0 ? 'high' : 'low'}
                                        decoding="async"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                                </Link>

                                <div className="absolute bottom-0 z-10 w-full p-6">
                                    <h3 className="mb-3 text-xl font-semibold text-white">{cat.name}</h3>

                                    <div className="flex flex-wrap gap-2">
                                        <Link
                                            href={`/category/${encodeURIComponent(cat.name)}`}
                                            className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-100"
                                        >
                                            Tout voir
                                        </Link>

                                        {cat.sub_category?.map((sub: any) => (
                                            <Link
                                                key={sub.id}
                                                href={`/category/${encodeURIComponent(cat.name)}?sub=${encodeURIComponent(sub.name)}`}
                                                className="rounded-full border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white hover:text-neutral-900"
                                            >
                                                {sub.name}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    )
}
