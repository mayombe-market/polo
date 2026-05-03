'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ShieldCheck, Star, Clock, MapPin, ChevronRight, Cake, Search, Sparkles, Heart, Phone } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Product {
    id: string
    name: string
    price: number
    img: string | null
    images_gallery?: string[] | null
    category: string
    seller_id: string | null
    created_at: string
    views_count: number
    stock_quantity?: number | null
    promo_percentage?: number | null
    promo_start_date?: string | null
    promo_end_date?: string | null
}

interface Seller {
    id: string
    shop_name: string | null
    store_name: string | null
    avatar_url: string | null
    city: string | null
    verification_status: string | null
    phone: string | null
    whatsapp_number: string | null
    coverImg: string | null
}

interface Props {
    products: Product[]
    sellers: Seller[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FILTER_PILLS = [
    { label: 'Tout voir', key: '' },
    { label: 'Gâteaux', key: 'gateau' },
    { label: 'Anniversaire', key: 'anniversaire' },
    { label: 'Mariage', key: 'mariage' },
    { label: 'Cupcakes', key: 'cupcake' },
    { label: 'Viennoiseries', key: 'viennoiserie' },
    { label: 'Box sucrées', key: 'box' },
    { label: 'Commande perso', key: 'personnalisee' },
]

const TRUST_ITEMS = [
    { icon: ShieldCheck, label: 'Pâtissiers vérifiés' },
    { icon: Clock, label: 'Livraison rapide' },
    { icon: Star, label: 'Avis clients' },
    { icon: MapPin, label: 'Brazzaville & Pointe-Noire' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
    if (!price) return 'Prix sur demande'
    return price.toLocaleString('fr-FR') + ' FCFA'
}

function isNew(created_at: string): boolean {
    const d = new Date(created_at)
    const now = new Date()
    return (now.getTime() - d.getTime()) < 14 * 24 * 60 * 60 * 1000
}

function getPromoPrice(product: Product): number | null {
    if (!product.promo_percentage || !product.promo_start_date || !product.promo_end_date) return null
    const now = new Date()
    const start = new Date(product.promo_start_date)
    const end = new Date(product.promo_end_date)
    if (now < start || now > end) return null
    return Math.round(product.price * (1 - product.promo_percentage / 100))
}

function matchesFilter(product: Product, key: string): boolean {
    if (!key) return true
    const name = product.name.toLowerCase()
    const keywords: Record<string, string[]> = {
        gateau: ['gâteau', 'gateau', 'cake'],
        anniversaire: ['anniversaire', 'birthday'],
        mariage: ['mariage', 'wedding', 'mariée'],
        cupcake: ['cupcake'],
        viennoiserie: ['croissant', 'pain au chocolat', 'brioche', 'viennoiserie'],
        box: ['box', 'coffret', 'assortiment'],
        personnalisee: ['personnalis', 'custom', 'sur mesure', 'commande'],
    }
    return (keywords[key] || [key]).some(k => name.includes(k))
}

function getSellerName(seller: Seller): string {
    return seller.shop_name || seller.store_name || 'Pâtisserie'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SellerCard({ seller }: { seller: Seller }) {
    const name = getSellerName(seller)
    const verified = seller.verification_status === 'verified'

    return (
        <Link href={`/seller/${seller.id}`} className="group flex-shrink-0 w-64 sm:w-72">
            <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-rose-50 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                {/* Cover */}
                <div className="relative h-36 bg-rose-50 overflow-hidden">
                    {seller.coverImg ? (
                        <Image
                            src={seller.coverImg}
                            alt={name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="288px"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Cake className="w-12 h-12 text-rose-200" />
                        </div>
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    {/* Verified badge */}
                    {verified && (
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-rose-500" />
                            <span className="text-[10px] font-semibold text-rose-600">Vérifié</span>
                        </div>
                    )}
                </div>

                {/* Avatar + info */}
                <div className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0 -mt-8 bg-rose-100">
                            {seller.avatar_url ? (
                                <Image src={seller.avatar_url} alt={name} fill className="object-cover" sizes="44px" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-rose-300">
                                    <Cake className="w-5 h-5" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-neutral-900 text-sm truncate">{name}</p>
                            {seller.city && (
                                <p className="text-xs text-neutral-400 flex items-center gap-0.5 mt-0.5">
                                    <MapPin className="w-3 h-3" />
                                    {seller.city}
                                </p>
                            )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-rose-300 flex-shrink-0" />
                    </div>
                </div>
            </div>
        </Link>
    )
}

function ProductCard({ product }: { product: Product }) {
    const promoPrice = getPromoPrice(product)
    const isNewProduct = isNew(product.created_at)
    const isPopular = product.views_count > 50

    return (
        <Link href={`/product/${product.id}`} className="group flex-shrink-0 w-44 sm:w-52">
            <div className="rounded-xl overflow-hidden bg-white shadow-sm border border-neutral-100 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                {/* Image */}
                <div className="relative aspect-square bg-rose-50 overflow-hidden">
                    {product.img ? (
                        <Image
                            src={product.img}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="208px"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Cake className="w-10 h-10 text-rose-200" />
                        </div>
                    )}
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {isNewProduct && (
                            <span className="bg-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                                Nouveau
                            </span>
                        )}
                        {isPopular && !isNewProduct && (
                            <span className="bg-amber-400 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                                Populaire
                            </span>
                        )}
                        {promoPrice && (
                            <span className="bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                                -{product.promo_percentage}%
                            </span>
                        )}
                    </div>
                    {/* Heart */}
                    <button className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                        <Heart className="w-3.5 h-3.5 text-rose-400" />
                    </button>
                </div>

                {/* Info */}
                <div className="p-3">
                    <p className="text-xs font-medium text-neutral-800 line-clamp-2 leading-snug">{product.name}</p>
                    <div className="mt-1.5 flex flex-col">
                        {promoPrice ? (
                            <>
                                <span className="text-sm font-bold text-rose-600">{formatPrice(promoPrice)}</span>
                                <span className="text-[10px] text-neutral-400 line-through">{formatPrice(product.price)}</span>
                            </>
                        ) : (
                            <span className="text-sm font-bold text-neutral-900">{formatPrice(product.price)}</span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PatisserieClient({ products, sellers }: Props) {
    const [activeFilter, setActiveFilter] = useState('')
    const [search, setSearch] = useState('')

    const filteredProducts = useMemo(() => {
        let result = products

        if (search.trim().length > 1) {
            const q = search.toLowerCase()
            result = result.filter(p => p.name.toLowerCase().includes(q))
        }

        if (activeFilter) {
            result = result.filter(p => matchesFilter(p, activeFilter))
        }

        return result
    }, [products, search, activeFilter])

    const hasResults = filteredProducts.length > 0
    const hasSellers = sellers.length > 0

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#FDF8F6' }}>

            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <section className="relative overflow-hidden bg-gradient-to-br from-rose-50 via-white to-pink-50 pt-12 pb-16 px-4">
                {/* Decorative blobs */}
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-rose-100/40 blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-pink-100/40 blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

                <div className="relative max-w-4xl mx-auto text-center">
                    {/* Pill badge */}
                    <div className="inline-flex items-center gap-2 bg-rose-100 text-rose-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-5 tracking-wide">
                        <Cake className="w-3.5 h-3.5" />
                        Pâtisserie & Boulangerie au Congo
                    </div>

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-neutral-900 leading-tight mb-4">
                        Des douceurs{' '}
                        <span className="font-semibold text-rose-500">faites avec amour</span>
                        <br className="hidden sm:block" />
                        {' '}livrées chez vous
                    </h1>

                    <p className="text-neutral-500 text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
                        Gâteaux sur mesure, pièces montées, cupcakes et viennoiseries — commandez directement auprès des meilleurs artisans.
                    </p>

                    {/* Search bar */}
                    <div className="relative max-w-xl mx-auto mb-8">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher un gâteau, une pâtisserie…"
                            className="w-full bg-white border border-rose-100 rounded-2xl pl-11 pr-5 py-3.5 text-sm text-neutral-800 placeholder-neutral-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
                        />
                    </div>

                    {/* Trust band */}
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
                        {TRUST_ITEMS.map(({ icon: Icon, label }) => (
                            <div key={label} className="flex items-center gap-1.5 text-neutral-500 text-xs">
                                <Icon className="w-3.5 h-3.5 text-rose-400" />
                                {label}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Filter Pills ─────────────────────────────────────────────── */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-rose-50 px-4 py-3 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
                <div className="max-w-5xl mx-auto">
                    <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
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
            </div>

            <div className="max-w-5xl mx-auto px-4 py-10 space-y-14">

                {/* ── Boutiques ────────────────────────────────────────────── */}
                {hasSellers && (
                    <section>
                        <div className="flex items-baseline justify-between mb-5">
                            <div>
                                <h2 className="text-lg font-semibold text-neutral-900">Nos pâtisseries</h2>
                                <p className="text-sm text-neutral-400 mt-0.5">Artisans sélectionnés à Brazzaville & Pointe-Noire</p>
                            </div>
                            <span className="text-xs text-neutral-400">{sellers.length} boutique{sellers.length > 1 ? 's' : ''}</span>
                        </div>

                        {/* Horizontal scroll */}
                        <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
                            {sellers.map(seller => (
                                <SellerCard key={seller.id} seller={seller} />
                            ))}
                        </div>
                    </section>
                )}

                {/* ── Products ─────────────────────────────────────────────── */}
                <section>
                    <div className="flex items-baseline justify-between mb-5">
                        <div>
                            <h2 className="text-lg font-semibold text-neutral-900">
                                {activeFilter || search
                                    ? `Résultats (${filteredProducts.length})`
                                    : 'Gâteaux du moment'}
                            </h2>
                            {!activeFilter && !search && (
                                <p className="text-sm text-neutral-400 mt-0.5">Les plus appréciés de notre communauté</p>
                            )}
                        </div>
                        {(activeFilter || search) && (
                            <button
                                onClick={() => { setActiveFilter(''); setSearch('') }}
                                className="text-xs text-rose-500 hover:underline"
                            >
                                Réinitialiser
                            </button>
                        )}
                    </div>

                    {hasResults ? (
                        <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4 sm:grid sm:grid-cols-3 lg:grid-cols-4 sm:overflow-visible sm:px-0 sm:mx-0">
                            {filteredProducts.map(p => (
                                <ProductCard key={p.id} product={p} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="text-5xl mb-4">🎂</div>
                            <p className="text-neutral-500 text-sm">Aucun produit trouvé pour cette recherche.</p>
                            <button
                                onClick={() => { setActiveFilter(''); setSearch('') }}
                                className="mt-4 text-sm text-rose-500 hover:underline"
                            >
                                Voir tous les produits
                            </button>
                        </div>
                    )}
                </section>

                {/* ── Commande personnalisée CTA ───────────────────────────── */}
                <section>
                    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-rose-500 to-pink-500 p-8 sm:p-10 text-white">
                        {/* Decorative */}
                        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />

                        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
                            <div className="text-5xl">🎂</div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-yellow-300" />
                                    <span className="text-xs font-semibold tracking-widest uppercase text-rose-100">Sur mesure</span>
                                </div>
                                <h3 className="text-xl sm:text-2xl font-semibold mb-2 leading-tight">
                                    Votre gâteau, exactement comme vous l'imaginez
                                </h3>
                                <p className="text-rose-100 text-sm leading-relaxed max-w-md">
                                    Anniversaire, mariage, baptême ou simplement pour faire plaisir — nos pâtissiers créent votre commande personnalisée.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 flex-shrink-0">
                                {hasSellers && sellers[0] && (
                                    <Link
                                        href={`/seller/${sellers[0].id}`}
                                        className="inline-flex items-center gap-2 bg-white text-rose-600 font-semibold text-sm px-6 py-3 rounded-full hover:bg-rose-50 transition-all shadow-sm"
                                    >
                                        <Cake className="w-4 h-4" />
                                        Commander maintenant
                                    </Link>
                                )}
                                {hasSellers && sellers[0]?.whatsapp_number && (
                                    <a
                                        href={`https://wa.me/${sellers[0].whatsapp_number.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2 bg-white/20 text-white font-medium text-sm px-6 py-2.5 rounded-full hover:bg-white/30 transition-all border border-white/30"
                                    >
                                        <Phone className="w-4 h-4" />
                                        Contacter par WhatsApp
                                    </a>
                                )}
                                {!hasSellers && (
                                    <Link
                                        href="/marketplace"
                                        className="inline-flex items-center gap-2 bg-white text-rose-600 font-semibold text-sm px-6 py-3 rounded-full hover:bg-rose-50 transition-all shadow-sm"
                                    >
                                        Voir le marketplace
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── How it works ─────────────────────────────────────────── */}
                <section>
                    <h2 className="text-lg font-semibold text-neutral-900 mb-6 text-center">Comment ça marche ?</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {[
                            {
                                step: '01',
                                title: 'Choisissez votre pâtisserie',
                                desc: 'Parcourez nos boutiques et trouvez le gâteau ou la pâtisserie qui vous fait envie.',
                                emoji: '🔍',
                            },
                            {
                                step: '02',
                                title: 'Passez commande',
                                desc: 'Contactez le pâtissier directement — il confirme et prépare votre commande sur mesure.',
                                emoji: '✅',
                            },
                            {
                                step: '03',
                                title: 'Recevez votre douceur',
                                desc: 'Livraison à domicile ou retrait en boutique, selon vos préférences.',
                                emoji: '🚚',
                            },
                        ].map(item => (
                            <div key={item.step} className="bg-white rounded-2xl p-6 border border-rose-50 shadow-sm text-center">
                                <div className="text-3xl mb-3">{item.emoji}</div>
                                <div className="text-xs font-bold text-rose-300 tracking-widest mb-1">{item.step}</div>
                                <h3 className="font-semibold text-neutral-900 text-sm mb-2">{item.title}</h3>
                                <p className="text-xs text-neutral-500 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Empty state for no sellers ───────────────────────────── */}
                {!hasSellers && !products.length && (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🎂</div>
                        <h3 className="text-xl font-semibold text-neutral-800 mb-2">Les pâtissiers arrivent bientôt</h3>
                        <p className="text-neutral-500 text-sm max-w-sm mx-auto leading-relaxed mb-6">
                            Nous sélectionnons les meilleurs artisans pâtissiers de Brazzaville et Pointe-Noire. Revenez très bientôt !
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 bg-rose-500 text-white px-8 py-3 rounded-full text-sm font-bold hover:bg-rose-600 transition-all"
                        >
                            ← Retour à l&apos;accueil
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
