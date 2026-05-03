'use client'

import Link from 'next/link'
import { Home, Cake, UtensilsCrossed, ShoppingBag, ArrowRight, ShoppingCart, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'
import dynamic from 'next/dynamic'

const AuthModal = dynamic(() => import('@/app/components/AuthModal'), { ssr: false })

const MODULES = [
    {
        key: 'immobilier',
        label: 'Immobilier',
        description: 'Appartements, villas, terrains. Vente, location, neuf.',
        cta: 'Explorer les biens',
        href: '/category/Immobilier',
        Icon: Home,
        iconBg: 'bg-emerald-500',
        cardBorder: 'hover:border-emerald-200 dark:hover:border-emerald-800/40',
        ctaClass: 'bg-emerald-500 hover:bg-emerald-600',
    },
    {
        key: 'patisserie',
        label: 'Pâtisserie',
        description: 'Gâteaux artisanaux, pains et douceurs livrés chez vous.',
        cta: 'Voir les créations',
        href: '/patisserie',
        Icon: Cake,
        iconBg: 'bg-pink-500',
        cardBorder: 'hover:border-pink-200 dark:hover:border-pink-800/40',
        ctaClass: 'bg-pink-500 hover:bg-pink-600',
    },
    {
        key: 'restaurant',
        label: 'Restaurants',
        description: 'Cuisine de chefs, plats du jour et fast-food livrés chez vous.',
        cta: 'Commander un plat',
        href: '/restaurant',
        Icon: UtensilsCrossed,
        iconBg: 'bg-orange-500',
        cardBorder: 'hover:border-orange-200 dark:hover:border-orange-800/40',
        ctaClass: 'bg-orange-500 hover:bg-orange-600',
    },
    {
        key: 'marketplace',
        label: 'Marketplace',
        description: 'Mode, tech, maison, beauté. Achetez et vendez de tout.',
        cta: 'Visiter la boutique',
        href: '/marketplace',
        Icon: ShoppingBag,
        iconBg: 'bg-blue-500',
        cardBorder: 'hover:border-blue-200 dark:hover:border-blue-800/40',
        ctaClass: 'bg-blue-500 hover:bg-blue-600',
    },
] as const

type Product = {
    id: string
    name: string
    price: number
    img: string | null
    category: string | null
}

type CarouselConfig = {
    label: string
    title: string
    href: string
    accentColor: string
    emptyIcon: string
    products: Product[]
}

function DiscoveryCarousel({ label, title, href, accentColor, emptyIcon, products }: CarouselConfig) {
    if (products.length === 0) {
        return (
            <div className="mt-14">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-neutral-400">{label}</p>
                        <h2 className="text-xl font-light text-neutral-900 dark:text-white mt-1">{title}</h2>
                    </div>
                    <Link href={href} className={`text-[11px] font-bold ${accentColor} hover:underline uppercase tracking-widest flex items-center gap-1`}>
                        Voir tout <ArrowRight size={12} />
                    </Link>
                </div>
                <div className="flex items-center gap-3 text-neutral-400 text-sm py-6 px-4 bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800">
                    <span className="text-2xl">{emptyIcon}</span>
                    <span>Bientôt disponible</span>
                </div>
            </div>
        )
    }

    return (
        <div className="mt-14">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-neutral-400">{label}</p>
                    <h2 className="text-xl font-light text-neutral-900 dark:text-white mt-1">{title}</h2>
                </div>
                <Link href={href} className={`text-[11px] font-bold ${accentColor} hover:underline uppercase tracking-widest flex items-center gap-1`}>
                    Voir tout <ArrowRight size={12} />
                </Link>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
                {products.map((p) => (
                    <Link
                        key={p.id}
                        href={`/product/${p.id}`}
                        className="flex-shrink-0 w-40 snap-start group no-underline"
                    >
                        <div className="w-40 h-40 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 mb-2">
                            {p.img ? (
                                <img
                                    src={p.img}
                                    alt={p.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl">
                                    {emptyIcon}
                                </div>
                            )}
                        </div>
                        <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate leading-snug">{p.name}</p>
                        <p className={`text-xs font-bold mt-0.5 ${accentColor}`}>
                            {(p.price || 0).toLocaleString('fr-FR')} F
                        </p>
                    </Link>
                ))}
            </div>
        </div>
    )
}

interface Props {
    marketplaceProducts: Product[]
    immobilierProducts: Product[]
    patisserieProducts: Product[]
    restaurantProducts: Product[]
}

export default function LandingPageClient({ marketplaceProducts, immobilierProducts, patisserieProducts, restaurantProducts }: Props) {
    const { user, profile } = useAuth()
    const [showAuth, setShowAuth] = useState(false)
    const firstName = profile?.first_name || null

    return (
        <div className="min-h-screen bg-[#FAFAF8] dark:bg-neutral-950">

            {/* Mini header */}
            <header className="flex items-center justify-between px-5 py-4 max-w-4xl mx-auto">
                <Link href="/" className="text-lg font-black uppercase italic tracking-tighter text-neutral-900 dark:text-white no-underline">
                    Mayombe <span className="text-orange-500">Market</span>
                </Link>
                <div className="flex items-center gap-3">
                    {user ? (
                        <>
                            <Link href="/cart" className="text-neutral-500 hover:text-orange-500 transition-colors">
                                <ShoppingCart size={20} />
                            </Link>
                            <Link
                                href={profile?.role === 'vendor' ? '/vendor/dashboard' : '/account/dashboard'}
                                className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200 hover:text-orange-500 transition-colors no-underline"
                            >
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                        <User size={14} className="text-orange-500" />
                                    </div>
                                )}
                                <span className="hidden sm:block">
                                    {firstName ? `Bonjour, ${firstName}` : 'Mon compte'}
                                </span>
                            </Link>
                        </>
                    ) : (
                        <button
                            onClick={() => setShowAuth(true)}
                            className="text-sm font-bold text-neutral-700 dark:text-neutral-200 hover:text-orange-500 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-2 rounded-full transition-colors"
                        >
                            Connexion
                        </button>
                    )}
                </div>
            </header>

            {showAuth && <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />}

            {/* Hero */}
            <div className="pt-10 pb-8 px-4 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-neutral-400 mb-3">
                    Mayombe Market
                </p>
                <h1 className="text-3xl md:text-4xl font-light tracking-tight text-neutral-900 dark:text-white mb-2">
                    Que cherchez-vous <span className="text-orange-500">aujourd&apos;hui</span>&nbsp;?
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-sm mx-auto">
                    Votre super-app congolaise — immobilier, restauration, pâtisserie et marketplace.
                </p>
            </div>

            <div className="max-w-4xl mx-auto px-4 pb-20">

                {/* 4 cartes modules */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                    {MODULES.map(({ key, label, description, cta, href, Icon, iconBg, cardBorder, ctaClass }) => (
                        <div
                            key={key}
                            className={`group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all duration-300 ${cardBorder}`}
                        >
                            <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                                <Icon size={22} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white tracking-tight mb-1">{label}</h2>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{description}</p>
                            </div>
                            <Link
                                href={href}
                                className={`inline-flex items-center gap-2 ${ctaClass} text-white text-sm font-bold px-5 py-2.5 rounded-full transition-all w-fit group-hover:gap-3`}
                            >
                                {cta}
                                <ArrowRight size={14} />
                            </Link>
                        </div>
                    ))}
                </div>

                {/* 4 carousels */}
                <DiscoveryCarousel
                    label="Marketplace"
                    title="Découvertes du moment"
                    href="/marketplace"
                    accentColor="text-blue-500"
                    emptyIcon="🛍️"
                    products={marketplaceProducts}
                />
                <DiscoveryCarousel
                    label="Immobilier"
                    title="Biens disponibles"
                    href="/category/Immobilier"
                    accentColor="text-emerald-600"
                    emptyIcon="🏠"
                    products={immobilierProducts}
                />
                <DiscoveryCarousel
                    label="Pâtisserie"
                    title="Douceurs du jour"
                    href="/patisserie"
                    accentColor="text-pink-500"
                    emptyIcon="🎂"
                    products={patisserieProducts}
                />
                <DiscoveryCarousel
                    label="Restaurants"
                    title="Plats à commander"
                    href="/restaurant"
                    accentColor="text-orange-500"
                    emptyIcon="🍽️"
                    products={restaurantProducts}
                />

            </div>
        </div>
    )
}
