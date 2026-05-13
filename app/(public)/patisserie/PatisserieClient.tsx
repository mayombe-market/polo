'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
    ShieldCheck, MapPin, Cake, Search, Clock, ChevronRight, Sparkles, Bike, ArrowLeft,
} from 'lucide-react'
import type { PatisserieSeller } from './page'

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTER_PILLS = [
    { label: 'Toutes', key: '' },
    { label: 'Brazzaville', key: 'brazzaville' },
    { label: 'Pointe-Noire', key: 'pointe-noire' },
    { label: 'Gâteaux', key: 'gateau' },
    { label: 'Cupcakes', key: 'cupcake' },
    { label: 'Mariage', key: 'mariage' },
    { label: 'Box sucrées', key: 'box' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSellerName(s: PatisserieSeller): string {
    return s.shop_name || s.store_name || 'Pâtisserie'
}

function getCoverImage(s: PatisserieSeller): string | null {
    return s.cover_image || s.products[0]?.img || null
}

function formatPrice(p: number): string {
    return p.toLocaleString('fr-FR') + ' FCFA'
}

const PRODUCT_KEYWORDS: Record<string, string[]> = {
    gateau: ['gâteau', 'gateau', 'cake', 'forêt noire', 'fraisier'],
    cupcake: ['cupcake'],
    mariage: ['mariage', 'wedding', 'mariée'],
    box: ['box', 'coffret', 'assortiment'],
}

// ─── ShopCard ─────────────────────────────────────────────────────────────────

function ShopCard({ seller }: { seller: PatisserieSeller }) {
    const name = getSellerName(seller)
    const cover = getCoverImage(seller)
    const verified = seller.verification_status === 'verified'

    return (
        <Link href={`/patisserie/${seller.id}`} className="group block">
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-100 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">

                {/* Cover image */}
                <div className="relative h-44 bg-rose-50 overflow-hidden">
                    {cover ? (
                        <Image
                            src={cover}
                            alt={name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-100 to-pink-50">
                            <Cake className="w-14 h-14 text-rose-200" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

                    {verified && (
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1 shadow-sm">
                            <ShieldCheck className="w-3 h-3 text-rose-500" />
                            <span className="text-[10px] font-bold text-rose-600">Vérifié</span>
                        </div>
                    )}

                    {/* Product count */}
                    <div className="absolute bottom-3 left-3 bg-black/55 backdrop-blur-sm text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
                        {seller.products.length} création{seller.products.length > 1 ? 's' : ''}
                    </div>
                </div>

                {/* Shop info */}
                <div className="p-4">
                    <div className="flex items-start gap-3">
                        {/* Floating avatar */}
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-md flex-shrink-0 -mt-8 bg-rose-100">
                            {seller.avatar_url ? (
                                <Image src={seller.avatar_url} alt={name} fill className="object-cover" sizes="48px" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Cake className="w-5 h-5 text-rose-300" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0 pt-1">
                            <h3 className="font-bold text-neutral-900 text-sm truncate">{name}</h3>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                                {seller.city && (
                                    <span className="flex items-center gap-0.5 text-xs text-neutral-400">
                                        <MapPin className="w-3 h-3" />
                                        {seller.city}
                                    </span>
                                )}
                                <span className="flex items-center gap-0.5 text-xs text-neutral-400">
                                    <Clock className="w-3 h-3" />
                                    {seller.delivery_time || '30-60 min'}
                                </span>
                                {seller.min_order ? (
                                    <span className="text-xs text-neutral-400">
                                        Min. {formatPrice(seller.min_order)}
                                    </span>
                                ) : null}
                                {seller.delivery_fee != null && (
                                    <span className={`flex items-center gap-0.5 text-xs font-semibold ${seller.delivery_fee === 0 ? 'text-green-600' : 'text-neutral-400'}`}>
                                        <Bike className="w-3 h-3" />
                                        {seller.delivery_fee === 0 ? 'Livraison gratuite' : formatPrice(seller.delivery_fee)}
                                    </span>
                                )}
                            </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-neutral-300 flex-shrink-0 mt-1 group-hover:text-rose-400 transition-colors" />
                    </div>

                    {/* Product thumbnails */}
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-0.5 scrollbar-hide">
                        {seller.products.slice(0, 4).map(p => (
                            <div
                                key={p.id}
                                className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-rose-50 border border-neutral-50"
                            >
                                {p.img ? (
                                    <Image src={p.img} alt={p.name} width={56} height={56} className="object-cover w-full h-full" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Cake className="w-5 h-5 text-rose-200" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {seller.products.length > 4 && (
                            <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-rose-50 flex items-center justify-center border border-neutral-50">
                                <span className="text-xs font-bold text-rose-400">+{seller.products.length - 4}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PatisserieClient({ shops }: { shops: PatisserieSeller[] }) {
    const [search, setSearch] = useState('')
    const [activeFilter, setActiveFilter] = useState('')

    const filteredShops = useMemo(() => {
        let result = shops

        if (search.trim().length > 1) {
            const q = search.toLowerCase()
            result = result.filter(s => {
                const name = getSellerName(s).toLowerCase()
                const city = (s.city || '').toLowerCase()
                const hasMatchingProduct = s.products.some(p =>
                    p.name.toLowerCase().includes(q)
                )
                return name.includes(q) || city.includes(q) || hasMatchingProduct
            })
        }

        if (activeFilter) {
            if (activeFilter === 'brazzaville' || activeFilter === 'pointe-noire') {
                result = result.filter(s =>
                    (s.city || '').toLowerCase().includes(activeFilter)
                )
            } else {
                const kws = PRODUCT_KEYWORDS[activeFilter] || [activeFilter]
                result = result.filter(s =>
                    s.products.some(p =>
                        kws.some(k => p.name.toLowerCase().includes(k))
                    )
                )
            }
        }

        return result
    }, [shops, search, activeFilter])

    const isFiltered = search.trim().length > 1 || !!activeFilter

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#FDF8F6' }}>

            {/* ── Nav retour marketplace ───────────────────────────────────── */}
            <div className="max-w-5xl mx-auto px-4 pt-4">
                <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-neutral-700 transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Marketplace
                </Link>
            </div>

            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <section className="relative overflow-hidden bg-gradient-to-br from-rose-50 via-white to-pink-50 pt-6 pb-14 px-4">
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-rose-100/40 blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-pink-100/40 blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

                <div className="relative max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-rose-100 text-rose-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-4 tracking-wide">
                        <Sparkles className="w-3.5 h-3.5" />
                        Pâtisserie & Boulangerie au Congo
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-light text-neutral-900 tracking-tight mb-3 leading-tight">
                        Des douceurs{' '}
                        <span className="font-semibold text-rose-500">faites avec amour</span>
                    </h1>

                    <p className="text-neutral-400 text-sm max-w-md mx-auto mb-7">
                        Gâteaux sur mesure, cupcakes, viennoiseries — commandez directement auprès des meilleurs artisans.
                    </p>

                    {/* Search */}
                    <div className="relative max-w-xl mx-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher une boutique ou un gâteau…"
                            className="w-full bg-white border border-rose-100 rounded-2xl pl-11 pr-5 py-3.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
                        />
                    </div>
                </div>
            </section>

            {/* ── Filter pills ─────────────────────────────────────────────── */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-rose-50 px-4 py-3 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
                <div className="max-w-5xl mx-auto flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
                    {FILTER_PILLS.map(pill => (
                        <button
                            key={pill.key}
                            onClick={() => setActiveFilter(pill.key)}
                            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                                activeFilter === pill.key
                                    ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-rose-300 hover:text-rose-600'
                            }`}
                        >
                            {pill.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Shop grid ────────────────────────────────────────────────── */}
            <div className="max-w-5xl mx-auto px-4 py-8">
                {filteredShops.length > 0 ? (
                    <>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base font-semibold text-neutral-900">
                                {isFiltered
                                    ? `${filteredShops.length} boutique${filteredShops.length > 1 ? 's' : ''} trouvée${filteredShops.length > 1 ? 's' : ''}`
                                    : `${filteredShops.length} pâtisserie${filteredShops.length > 1 ? 's' : ''}`}
                            </h2>
                            {isFiltered && (
                                <button
                                    onClick={() => { setSearch(''); setActiveFilter('') }}
                                    className="text-xs text-rose-500 hover:underline"
                                >
                                    Réinitialiser
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredShops.map(shop => (
                                <ShopCard key={shop.id} seller={shop} />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-24">
                        <div className="text-5xl mb-4">🎂</div>
                        <p className="font-semibold text-neutral-700 mb-1">Aucune boutique trouvée</p>
                        <p className="text-sm text-neutral-400 mb-5">
                            Essayez un autre terme ou explorez toutes les pâtisseries.
                        </p>
                        <button
                            onClick={() => { setSearch(''); setActiveFilter('') }}
                            className="inline-flex items-center gap-2 bg-rose-500 text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-rose-600 transition-all"
                        >
                            Voir toutes les boutiques
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
