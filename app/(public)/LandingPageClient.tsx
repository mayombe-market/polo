'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    Home, Cake, UtensilsCrossed, ShoppingBag,
    ArrowRight, ShoppingCart, User, Search, X
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import dynamic from 'next/dynamic'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

const AuthModal = dynamic(() => import('@/app/components/AuthModal'), { ssr: false })
const supabase = getSupabaseBrowserClient()

/* ─── Filtres modules ─────────────────────────────────────── */
const FILTERS = [
    { key: 'immobilier',  Icon: Home,           color: 'bg-emerald-500', ring: 'ring-emerald-300', category: 'Immobilier',            label: 'Immobilier' },
    { key: 'patisserie',  Icon: Cake,           color: 'bg-pink-500',    ring: 'ring-pink-300',    category: 'Pâtisserie & Traiteur', label: 'Pâtisserie' },
    { key: 'restaurant',  Icon: UtensilsCrossed, color: 'bg-orange-500', ring: 'ring-orange-300',  category: 'Alimentation & Boissons', label: 'Restaurants' },
    { key: 'marketplace', Icon: ShoppingBag,    color: 'bg-blue-500',    ring: 'ring-blue-300',    category: null,                    label: 'Marketplace' },
] as const

type FilterKey = typeof FILTERS[number]['key']

const PLACEHOLDERS = [
    'Rechercher une propriété, une douceur, un plat…',
    'Trouver un appartement à Brazzaville…',
    'Commander un gâteau sur mesure…',
    'Découvrir des plats congolais…',
    'Chercher un produit dans la marketplace…',
]

/* ─── Modules landing ─────────────────────────────────────── */
const MODULES = [
    { key: 'immobilier',  label: 'Immobilier', description: 'Appartements, villas, terrains. Vente, location, neuf.', cta: 'Explorer les biens',  href: '/category/Immobilier', Icon: Home,           iconBg: 'bg-emerald-500', cardBorder: 'hover:border-emerald-200 dark:hover:border-emerald-800/40', ctaClass: 'bg-emerald-500 hover:bg-emerald-600' },
    { key: 'patisserie',  label: 'Pâtisserie',  description: 'Gâteaux artisanaux, pains et douceurs livrés chez vous.', cta: 'Voir les créations',  href: '/patisserie',           Icon: Cake,           iconBg: 'bg-pink-500',    cardBorder: 'hover:border-pink-200 dark:hover:border-pink-800/40',    ctaClass: 'bg-pink-500 hover:bg-pink-600' },
    { key: 'restaurant',  label: 'Restaurants', description: 'Cuisine de chefs, plats du jour et fast-food livrés chez vous.', cta: 'Commander un plat', href: '/restaurant',          Icon: UtensilsCrossed, iconBg: 'bg-orange-500', cardBorder: 'hover:border-orange-200 dark:hover:border-orange-800/40', ctaClass: 'bg-orange-500 hover:bg-orange-600' },
    { key: 'marketplace', label: 'Marketplace', description: 'Mode, tech, maison, beauté. Achetez et vendez de tout.', cta: 'Visiter la boutique', href: '/marketplace',          Icon: ShoppingBag,    iconBg: 'bg-blue-500',    cardBorder: 'hover:border-blue-200 dark:hover:border-blue-800/40',    ctaClass: 'bg-blue-500 hover:bg-blue-600' },
] as const

/* ─── Types ───────────────────────────────────────────────── */
type Product = { id: string; name: string; price: number; img: string | null; category: string | null }

interface Props {
    marketplaceProducts: Product[]
    immobilierProducts: Product[]
    patisserieProducts: Product[]
    restaurantProducts: Product[]
}

/* ─── Carousel ────────────────────────────────────────────── */
function DiscoveryCarousel({ label, title, href, accentColor, emptyIcon, products }: {
    label: string; title: string; href: string; accentColor: string; emptyIcon: string; products: Product[]
}) {
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
            {products.length === 0 ? (
                <div className="flex items-center gap-3 text-neutral-400 text-sm py-6 px-4 bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800">
                    <span className="text-2xl">{emptyIcon}</span>
                    <span>Bientôt disponible</span>
                </div>
            ) : (
                <div className="flex gap-4 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
                    {products.map((p) => (
                        <Link key={p.id} href={`/product/${p.id}`} className="flex-shrink-0 w-40 snap-start group no-underline">
                            <div className="w-40 h-40 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 mb-2">
                                {p.img
                                    ? <img src={p.img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                                    : <div className="w-full h-full flex items-center justify-center text-4xl">{emptyIcon}</div>}
                            </div>
                            <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate leading-snug">{p.name}</p>
                            <p className={`text-xs font-bold mt-0.5 ${accentColor}`}>{(p.price || 0).toLocaleString('fr-FR')} F</p>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}

/* ─── Barre de recherche universelle ─────────────────────── */
function SearchBar() {
    const router = useRouter()
    const [query, setQuery] = useState('')
    const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null)
    const [results, setResults] = useState<Product[]>([])
    const [loading, setLoading] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0])
    const wrapperRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Placeholder tournant
    useEffect(() => {
        let i = 0
        const t = setInterval(() => { i = (i + 1) % PLACEHOLDERS.length; setPlaceholder(PLACEHOLDERS[i]) }, 3500)
        return () => clearInterval(t)
    }, [])

    // Fermer au clic extérieur
    useEffect(() => {
        const fn = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowDropdown(false)
        }
        document.addEventListener('mousedown', fn)
        return () => document.removeEventListener('mousedown', fn)
    }, [])

    // Recherche Supabase (debounced 300 ms)
    const doSearch = useCallback(async (q: string, filter: FilterKey | null) => {
        if (q.trim().length < 2) { setResults([]); setShowDropdown(false); return }
        setLoading(true)
        let req = supabase.from('products').select('id, name, price, img, category').ilike('name', `%${q.trim()}%`).limit(6)
        if (filter) {
            const f = FILTERS.find(x => x.key === filter)
            if (f?.category) req = req.eq('category', f.category)
            else req = req.neq('category', 'Immobilier') // marketplace = tout sauf immo
        }
        const { data } = await req
        setResults(data || [])
        setShowDropdown(true)
        setLoading(false)
    }, [])

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => doSearch(query, activeFilter), 300)
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [query, activeFilter, doSearch])

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!query.trim()) return
        setShowDropdown(false)
        const params = new URLSearchParams({ q: query })
        router.push(`/marketplace?${params}`)
    }

    return (
        <div ref={wrapperRef} className="relative w-full max-w-2xl mx-auto">
            <form onSubmit={handleSubmit}>
                <div className="flex items-center bg-white rounded-full shadow-md border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 px-5 py-3.5 gap-3">
                    <Search size={17} className="text-neutral-400 flex-shrink-0" />

                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onFocus={() => results.length > 0 && setShowDropdown(true)}
                        placeholder={placeholder}
                        className="flex-1 bg-transparent text-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 outline-none min-w-0"
                    />

                    {query && (
                        <button type="button" onClick={() => { setQuery(''); setResults([]); setShowDropdown(false) }}>
                            <X size={15} className="text-neutral-400 hover:text-neutral-600 transition-colors" />
                        </button>
                    )}

                    <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 flex-shrink-0" />

                    {/* 4 icônes filtres */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {FILTERS.map(({ key, Icon, color, ring, label }) => (
                            <button
                                key={key}
                                type="button"
                                title={label}
                                onClick={() => setActiveFilter(prev => prev === key ? null : key)}
                                className={`w-7 h-7 rounded-full ${color} flex items-center justify-center transition-all ${
                                    activeFilter === key
                                        ? `ring-2 ${ring} ring-offset-1 scale-110 shadow-sm`
                                        : 'opacity-60 hover:opacity-100'
                                }`}
                            >
                                <Icon size={13} className="text-white" />
                            </button>
                        ))}
                    </div>
                </div>
            </form>

            {/* Dropdown résultats */}
            {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-800 overflow-hidden z-50">
                    {loading ? (
                        <p className="px-5 py-6 text-center text-sm text-neutral-400">Recherche en cours…</p>
                    ) : results.length === 0 ? (
                        <p className="px-5 py-6 text-center text-sm text-neutral-400">Aucun résultat pour « {query} »</p>
                    ) : (
                        <>
                            {results.map((r, i) => (
                                <Link
                                    key={r.id}
                                    href={`/product/${r.id}`}
                                    onClick={() => setShowDropdown(false)}
                                    className={`flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors no-underline ${i > 0 ? 'border-t border-neutral-50 dark:border-neutral-800' : ''}`}
                                >
                                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex-shrink-0">
                                        {r.img
                                            ? <img src={r.img} alt={r.name} className="w-full h-full object-cover" />
                                            : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={16} className="text-neutral-300" /></div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{r.name}</p>
                                        <p className="text-[11px] text-neutral-400 truncate">{r.category || ''}</p>
                                    </div>
                                    <p className="text-sm font-bold text-orange-500 flex-shrink-0">
                                        {r.category === 'Immobilier' ? 'Voir →' : `${(r.price || 0).toLocaleString('fr-FR')} F`}
                                    </p>
                                </Link>
                            ))}
                            <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 py-2.5">
                                <button onClick={() => handleSubmit()} className="text-xs font-bold text-orange-500 hover:underline">
                                    Voir tous les résultats pour « {query} » →
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

/* ─── Page principale ─────────────────────────────────────── */
export default function LandingPageClient({ marketplaceProducts, immobilierProducts, patisserieProducts, restaurantProducts }: Props) {
    const { user, profile } = useAuth()
    const [showAuth, setShowAuth] = useState(false)
    const firstName = profile?.first_name || null

    return (
        <div className="min-h-screen bg-[#F9F8F6] dark:bg-neutral-950">

            {/* ── Header ── */}
            <header className="flex items-center justify-between px-5 py-4 max-w-5xl mx-auto">
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
                                {profile?.avatar_url
                                    ? <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                    : <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center"><User size={14} className="text-orange-500" /></div>}
                                <span className="hidden sm:block">{firstName ? `Bonjour, ${firstName}` : 'Mon compte'}</span>
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

            {/* ── Hero + Recherche ── */}
            <div className="pt-8 pb-10 px-4 text-center max-w-5xl mx-auto">
                <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-neutral-400 mb-3">
                    Mayombe Market
                </p>
                <h1 className="text-3xl md:text-4xl font-light tracking-tight text-neutral-900 dark:text-white mb-6">
                    Que cherchez-vous <span className="text-orange-500">aujourd&apos;hui</span>&nbsp;?
                </h1>

                {/* Barre de recherche universelle */}
                <SearchBar />

                {/* Légende des filtres */}
                <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
                    {FILTERS.map(({ key, Icon, color, label }) => (
                        <span key={key} className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                            <span className={`w-3.5 h-3.5 rounded-full ${color} inline-flex items-center justify-center`}>
                                <Icon size={8} className="text-white" />
                            </span>
                            {label}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── 4 cartes modules ── */}
            <div className="max-w-4xl mx-auto px-4 pb-20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                    {MODULES.map(({ key, label, description, cta, href, Icon, iconBg, cardBorder, ctaClass }) => (
                        <div key={key} className={`group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all duration-300 ${cardBorder}`}>
                            <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                                <Icon size={22} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white tracking-tight mb-1">{label}</h2>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{description}</p>
                            </div>
                            <Link href={href} className={`inline-flex items-center gap-2 ${ctaClass} text-white text-sm font-bold px-5 py-2.5 rounded-full transition-all w-fit group-hover:gap-3`}>
                                {cta} <ArrowRight size={14} />
                            </Link>
                        </div>
                    ))}
                </div>

                {/* ── 4 carousels ── */}
                <DiscoveryCarousel label="Marketplace"  title="Découvertes du moment" href="/marketplace"              accentColor="text-blue-500"    emptyIcon="🛍️" products={marketplaceProducts} />
                <DiscoveryCarousel label="Immobilier"   title="Biens disponibles"     href="/category/Immobilier"      accentColor="text-emerald-600" emptyIcon="🏠"  products={immobilierProducts} />
                <DiscoveryCarousel label="Pâtisserie"   title="Douceurs du jour"      href="/patisserie"               accentColor="text-pink-500"    emptyIcon="🎂"  products={patisserieProducts} />
                <DiscoveryCarousel label="Restaurants"  title="Plats à commander"     href="/restaurant"               accentColor="text-orange-500"  emptyIcon="🍽️" products={restaurantProducts} />
            </div>
        </div>
    )
}
