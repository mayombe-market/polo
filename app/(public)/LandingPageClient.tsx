'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    Home, Cake, UtensilsCrossed, ShoppingBag, ArrowRight,
    ShoppingCart, User, Search, X, ShieldCheck, Truck,
    CreditCard, MapPin, MessageCircle, Star, Moon, Sun,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import dynamic from 'next/dynamic'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

const AuthModal = dynamic(() => import('@/app/components/AuthModal'), { ssr: false })
const supabase = getSupabaseBrowserClient()

/* ─── Types ───────────────────────────────────────────────── */
type Product = {
    id: string
    name: string
    price: number
    img: string | null
    category: string | null
    created_at?: string
    views_count?: number
}

interface Props {
    marketplaceProducts: Product[]
    immobilierProducts: Product[]
    patisserieProducts: Product[]
    restaurantProducts: Product[]
}

/* ─── Filtres & modules ───────────────────────────────────── */
const FILTERS = [
    { key: 'immobilier',  Icon: Home,            color: 'bg-emerald-500', ring: 'ring-emerald-300', category: 'Immobilier',             label: 'Immobilier'  },
    { key: 'patisserie',  Icon: Cake,            color: 'bg-pink-500',    ring: 'ring-pink-300',    category: 'Pâtisserie & Traiteur',  label: 'Pâtisserie'  },
    { key: 'restaurant',  Icon: UtensilsCrossed, color: 'bg-orange-500',  ring: 'ring-orange-300',  category: 'Alimentation & Boissons', label: 'Restaurants' },
    { key: 'marketplace', Icon: ShoppingBag,     color: 'bg-blue-500',    ring: 'ring-blue-300',    category: null,                     label: 'Marketplace' },
] as const
type FilterKey = typeof FILTERS[number]['key']

const MODULES = [
    {
        key: 'immobilier', label: 'Immobilier', badge: 'Biens disponibles',
        description: 'Appartements, villas, terrains à Brazzaville et Pointe-Noire.',
        cta: 'Explorer les biens', href: '/category/Immobilier',
        Icon: Home,
        iconBg: 'bg-emerald-500',
        lightBg: 'bg-emerald-50 dark:bg-emerald-900/20',
        border: 'border-emerald-100 dark:border-emerald-900/40',
        hover: 'hover:border-emerald-300 dark:hover:border-emerald-700',
        ctaClass: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200',
        textAccent: 'text-emerald-600 dark:text-emerald-400',
    },
    {
        key: 'patisserie', label: 'Pâtisserie', badge: 'Commandes sur mesure',
        description: 'Gâteaux artisanaux, layer cakes et pains livrés chez vous.',
        cta: 'Voir les créations', href: '/patisserie',
        Icon: Cake,
        iconBg: 'bg-pink-500',
        lightBg: 'bg-pink-50 dark:bg-pink-900/20',
        border: 'border-pink-100 dark:border-pink-900/40',
        hover: 'hover:border-pink-300 dark:hover:border-pink-700',
        ctaClass: 'bg-pink-500 hover:bg-pink-600 shadow-pink-200',
        textAccent: 'text-pink-600 dark:text-pink-400',
    },
    {
        key: 'restaurant', label: 'Restaurants', badge: 'Plats du jour',
        description: 'Cuisine congolaise, burgers, grillades livrés chez vous.',
        cta: 'Commander un plat', href: '/restaurant',
        Icon: UtensilsCrossed,
        iconBg: 'bg-orange-500',
        lightBg: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-orange-100 dark:border-orange-900/40',
        hover: 'hover:border-orange-300 dark:hover:border-orange-700',
        ctaClass: 'bg-orange-500 hover:bg-orange-600 shadow-orange-200',
        textAccent: 'text-orange-600 dark:text-orange-400',
    },
    {
        key: 'marketplace', label: 'Marketplace', badge: 'Boutique en ligne',
        description: 'Mode, high-tech, maison et beauté. Achetez et vendez.',
        cta: 'Visiter la boutique', href: '/marketplace',
        Icon: ShoppingBag,
        iconBg: 'bg-blue-500',
        lightBg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-100 dark:border-blue-900/40',
        hover: 'hover:border-blue-300 dark:hover:border-blue-700',
        ctaClass: 'bg-blue-500 hover:bg-blue-600 shadow-blue-200',
        textAccent: 'text-blue-600 dark:text-blue-400',
    },
] as const

const TRUST_BAND = [
    { Icon: MapPin,        text: 'Brazzaville & Pointe-Noire', color: 'text-emerald-600' },
    { Icon: CreditCard,    text: 'Paiement Mobile Money',      color: 'text-orange-500'  },
    { Icon: Truck,         text: 'Livraison locale',            color: 'text-blue-500'    },
    { Icon: ShieldCheck,   text: 'Vendeurs vérifiés',           color: 'text-purple-500'  },
]

const WHY_ITEMS = [
    { Icon: ShieldCheck,   title: 'Vendeurs vérifiés',     desc: 'Chaque vendeur est contrôlé et approuvé par notre équipe avant de vendre.',  color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/10', border: 'border-emerald-100 dark:border-emerald-800/30' },
    { Icon: CreditCard,    title: 'Paiement Mobile Money', desc: 'Payez en toute sécurité via MTN Money ou Airtel Money, sans carte bancaire.',  color: 'text-orange-500',  bg: 'bg-orange-50 dark:bg-orange-900/10',   border: 'border-orange-100 dark:border-orange-800/30'  },
    { Icon: Truck,         title: 'Livraison locale',       desc: 'Nos livreurs assurent la livraison à Brazzaville et Pointe-Noire.',           color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-900/10',       border: 'border-blue-100 dark:border-blue-800/30'      },
    { Icon: MessageCircle, title: 'Support client',         desc: 'Une équipe réactive disponible 7j/7 pour répondre à toutes vos questions.',   color: 'text-purple-600',  bg: 'bg-purple-50 dark:bg-purple-900/10',   border: 'border-purple-100 dark:border-purple-800/30'  },
]

const PLACEHOLDERS = [
    'Rechercher une propriété, une douceur, un plat…',
    'Trouver un appartement à Brazzaville…',
    'Commander un gâteau sur mesure…',
    'Découvrir des plats congolais…',
    'Chercher un produit dans la marketplace…',
]

/* ─── Helpers ─────────────────────────────────────────────── */
function isNewProduct(created_at?: string) {
    if (!created_at) return false
    return Date.now() - new Date(created_at).getTime() < 14 * 24 * 60 * 60 * 1000
}

function formatPrice(price: number, isImmobilier = false) {
    if (isImmobilier && (!price || price === 0)) return 'Prix sur demande'
    return `${(price || 0).toLocaleString('fr-FR')} F`
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

    useEffect(() => {
        let i = 0
        const t = setInterval(() => { i = (i + 1) % PLACEHOLDERS.length; setPlaceholder(PLACEHOLDERS[i]) }, 3500)
        return () => clearInterval(t)
    }, [])

    useEffect(() => {
        const fn = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowDropdown(false)
        }
        document.addEventListener('mousedown', fn)
        return () => document.removeEventListener('mousedown', fn)
    }, [])

    const doSearch = useCallback(async (q: string, filter: FilterKey | null) => {
        if (q.trim().length < 2) { setResults([]); setShowDropdown(false); return }
        setLoading(true)
        let req = supabase.from('products').select('id, name, price, img, category').ilike('name', `%${q.trim()}%`).limit(6)
        if (filter) {
            const f = FILTERS.find(x => x.key === filter)
            if (f?.category) req = req.eq('category', f.category)
            else req = req.neq('category', 'Immobilier')
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
        const q = encodeURIComponent(query.trim())
        const dest =
            activeFilter === 'patisserie' ? `/patisserie?q=${q}` :
            activeFilter === 'restaurant' ? `/restaurant?q=${q}` :
            activeFilter === 'immobilier' ? `/search?q=${q}&category=${encodeURIComponent('Immobilier')}` :
            `/search?q=${q}`
        router.push(dest)
    }

    return (
        <div ref={wrapperRef} className="relative w-full max-w-2xl mx-auto">
            <form onSubmit={handleSubmit}>
                <div className="flex items-center bg-white dark:bg-neutral-900 rounded-full shadow-lg shadow-neutral-200/60 dark:shadow-neutral-900 border border-neutral-200 dark:border-neutral-700 px-5 py-4 gap-3">
                    <Search size={17} className="text-neutral-400 flex-shrink-0" />
                    <input
                        type="text" value={query}
                        onChange={e => setQuery(e.target.value)}
                        onFocus={() => results.length > 0 && setShowDropdown(true)}
                        placeholder={placeholder}
                        className="flex-1 bg-transparent text-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 outline-none min-w-0"
                    />
                    {query && (
                        <button type="button" onClick={() => { setQuery(''); setResults([]); setShowDropdown(false) }}>
                            <X size={15} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors" />
                        </button>
                    )}
                    <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 flex-shrink-0" />
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {FILTERS.map(({ key, Icon, color, ring, label }) => (
                            <button key={key} type="button" title={label}
                                onClick={() => setActiveFilter(prev => prev === key ? null : key)}
                                className={`w-7 h-7 rounded-full ${color} flex items-center justify-center transition-all ${
                                    activeFilter === key ? `ring-2 ${ring} ring-offset-1 scale-110` : 'opacity-55 hover:opacity-100'
                                }`}
                            >
                                <Icon size={12} className="text-white" />
                            </button>
                        ))}
                    </div>
                </div>
            </form>

            {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl shadow-neutral-200/80 dark:shadow-neutral-950 border border-neutral-100 dark:border-neutral-800 overflow-hidden z-50">
                    {loading ? (
                        <p className="px-5 py-6 text-center text-sm text-neutral-400">Recherche en cours…</p>
                    ) : results.length === 0 ? (
                        <p className="px-5 py-6 text-center text-sm text-neutral-400">Aucun résultat pour «&nbsp;{query}&nbsp;»</p>
                    ) : (
                        <>
                            {results.map((r, i) => (
                                <Link key={r.id} href={`/product/${r.id}`} onClick={() => setShowDropdown(false)}
                                    className={`flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors no-underline ${i > 0 ? 'border-t border-neutral-50 dark:border-neutral-800' : ''}`}
                                >
                                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex-shrink-0">
                                        {r.img ? <img src={r.img} alt={r.name} className="w-full h-full object-cover" />
                                            : <ShoppingBag size={16} className="text-neutral-300 m-auto mt-2.5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{r.name}</p>
                                        <p className="text-[11px] text-neutral-400 truncate">{r.category}</p>
                                    </div>
                                    <p className="text-sm font-bold text-orange-500 flex-shrink-0">
                                        {formatPrice(r.price, r.category === 'Immobilier')}
                                    </p>
                                </Link>
                            ))}
                            <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 py-2.5">
                                <button onClick={() => handleSubmit()} className="text-xs font-bold text-orange-500 hover:underline">
                                    Voir tous les résultats pour «&nbsp;{query}&nbsp;» →
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

/* ─── Carte produit (carousel) ────────────────────────────── */
function ProductCard({ p, accentColor, isImmobilier }: { p: Product; accentColor: string; isImmobilier?: boolean }) {
    const isNew = isNewProduct(p.created_at)
    const isPopular = (p.views_count || 0) > 50

    return (
        <Link href={`/product/${p.id}`} className="flex-shrink-0 w-44 snap-start group no-underline">
            <div className="relative w-44 h-44 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 mb-3 shadow-sm group-hover:shadow-md transition-shadow duration-300">
                {p.img
                    ? <img src={p.img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl text-neutral-300">📦</div>
                }
                {isNew && !isPopular && (
                    <span className="absolute top-2 left-2 bg-orange-500 text-white text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full">
                        Nouveau
                    </span>
                )}
                {isPopular && (
                    <span className="absolute top-2 left-2 bg-purple-500 text-white text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <Star size={8} className="fill-white" /> Populaire
                    </span>
                )}
            </div>
            <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate leading-snug">{p.name}</p>
            <p className={`text-xs font-bold mt-1 ${accentColor}`}>{formatPrice(p.price, isImmobilier)}</p>
        </Link>
    )
}

/* ─── Section carousel ────────────────────────────────────── */
function DiscoveryCarousel({ label, title, href, accentColor, emptyIcon, products, isImmobilier }: {
    label: string; title: string; href: string; accentColor: string
    emptyIcon: string; products: Product[]; isImmobilier?: boolean
}) {
    return (
        <div className="mt-16">
            <div className="flex items-end justify-between mb-6">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-neutral-400 mb-1">{label}</p>
                    <h2 className="text-2xl font-light text-neutral-900 dark:text-white tracking-tight">{title}</h2>
                </div>
                <Link href={href} className={`text-[11px] font-bold ${accentColor} hover:underline uppercase tracking-widest flex items-center gap-1 mb-1`}>
                    Voir tout <ArrowRight size={12} />
                </Link>
            </div>

            {products.length === 0 ? (
                <div className="flex items-center gap-3 text-neutral-400 text-sm py-8 px-5 bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700">
                    <span className="text-3xl">{emptyIcon}</span>
                    <div>
                        <p className="font-semibold text-neutral-500 dark:text-neutral-400">Bientôt disponible</p>
                        <p className="text-xs text-neutral-400 mt-0.5">Les premiers produits arrivent prochainement.</p>
                    </div>
                </div>
            ) : (
                <div className="flex gap-4 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
                    {products.map(p => (
                        <ProductCard key={p.id} p={p} accentColor={accentColor} isImmobilier={isImmobilier} />
                    ))}
                </div>
            )}
        </div>
    )
}

/* ─── Footer landing ──────────────────────────────────────── */
function LandingFooter() {
    return (
        <footer className="border-t border-neutral-200 dark:border-neutral-800 mt-20 bg-white dark:bg-neutral-900">
            <div className="max-w-5xl mx-auto px-5 py-12">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
                    <div className="sm:col-span-1">
                        <p className="text-base font-black uppercase italic tracking-tighter text-neutral-900 dark:text-white">
                            Mayombe <span className="text-orange-500">Market</span>
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mt-2 max-w-[220px]">
                            Votre plateforme congolaise pour acheter, commander, vendre et trouver des biens.
                        </p>
                        <p className="text-xs text-neutral-400 mt-3">
                            📍 Brazzaville &amp; Pointe-Noire
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">Liens utiles</p>
                        <div className="flex flex-col gap-2">
                            {[
                                { label: 'À propos', href: '/about' },
                                { label: "Conditions d'utilisation", href: '/terms' },
                                { label: 'Confidentialité', href: '/privacy' },
                                { label: 'Contact', href: '/contact' },
                            ].map(l => (
                                <Link key={l.href} href={l.href} className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-orange-500 transition-colors no-underline">
                                    {l.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">Nos zones</p>
                        <div className="flex gap-2 mb-4">
                            {['Brazzaville', 'Pointe-Noire'].map(z => (
                                <span key={z} className="text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-3 py-1 rounded-full">
                                    {z}
                                </span>
                            ))}
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Contact</p>
                        <a href="mailto:contact@mayombe-market.com" className="text-xs text-orange-500 hover:underline">
                            contact@mayombe-market.com
                        </a>
                    </div>
                </div>

                <div className="border-t border-neutral-100 dark:border-neutral-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p className="text-[11px] text-neutral-400">© {new Date().getFullYear()} Mayombe Market. Tous droits réservés.</p>
                    <div className="flex gap-4">
                        {(['Marketplace', 'Immobilier', 'Pâtisserie', 'Restaurants'] as const).map(m => (
                            <span key={m} className="text-[11px] text-neutral-400">{m}</span>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    )
}

/* ─── Page principale ─────────────────────────────────────── */
export default function LandingPageClient({ marketplaceProducts, immobilierProducts, patisserieProducts, restaurantProducts }: Props) {
    const { user, profile } = useAuth()
    const [showAuth, setShowAuth] = useState(false)
    const [isDark, setIsDark] = useState(false)
    const firstName = profile?.first_name || null

    // Lire l'état du mode sombre depuis le DOM (classe sur <html>)
    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'))
    }, [])

    const toggleDark = () => {
        const next = !isDark
        setIsDark(next)
        if (next) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('darkMode', 'true')
        } else {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('darkMode', 'false')
        }
    }

    return (
        <div className="min-h-screen bg-[#F9F8F6] dark:bg-neutral-950">

            {/* ── Header ── */}
            <header className="flex items-center justify-between px-5 py-4 max-w-5xl mx-auto">
                <Link href="/" className="text-lg font-black uppercase italic tracking-tighter text-neutral-900 dark:text-white no-underline">
                    Mayombe <span className="text-orange-500">Market</span>
                </Link>
                <div className="flex items-center gap-3">
                    {/* Toggle dark mode */}
                    <button
                        onClick={toggleDark}
                        className="w-9 h-9 rounded-full flex items-center justify-center border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                        title={isDark ? 'Mode clair' : 'Mode sombre'}
                    >
                        {isDark ? <Sun size={16} /> : <Moon size={16} />}
                    </button>

                    {user ? (
                        <>
                            <Link href="/cart" className="text-neutral-500 dark:text-neutral-400 hover:text-orange-500 transition-colors">
                                <ShoppingCart size={20} />
                            </Link>
                            <Link
                                href={profile?.role === 'vendor' ? '/vendor/dashboard' : '/account/dashboard'}
                                className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200 hover:text-orange-500 transition-colors no-underline"
                            >
                                {profile?.avatar_url
                                    ? <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                    : <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center"><User size={14} className="text-orange-500" /></div>
                                }
                                <span className="hidden sm:block">{firstName ? `Bonjour, ${firstName}` : 'Mon compte'}</span>
                            </Link>
                        </>
                    ) : (
                        <button onClick={() => setShowAuth(true)}
                            className="text-sm font-bold text-neutral-700 dark:text-neutral-200 hover:text-orange-500 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-2 rounded-full transition-colors"
                        >
                            Connexion
                        </button>
                    )}
                </div>
            </header>

            {showAuth && <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />}

            {/* ── Hero ── */}
            <section className="pt-10 pb-12 px-4 text-center max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30 text-orange-600 dark:text-orange-400 text-[11px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    Brazzaville &amp; Pointe-Noire
                </div>

                <h1 className="text-4xl md:text-5xl font-light tracking-tight text-neutral-900 dark:text-white leading-tight mb-4">
                    Trouvez tout au Congo,<br />
                    <span className="text-orange-500">en un seul endroit</span>
                </h1>

                <p className="text-neutral-500 dark:text-neutral-400 text-base max-w-lg mx-auto leading-relaxed mb-8">
                    Immobilier, restauration, pâtisserie et marketplace à Brazzaville et Pointe-Noire.
                </p>

                <SearchBar />

                <div className="flex items-center justify-center gap-5 mt-5 flex-wrap">
                    {FILTERS.map(({ key, Icon, color, label }) => (
                        <span key={key} className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                            <span className={`w-4 h-4 rounded-full ${color} inline-flex items-center justify-center`}>
                                <Icon size={9} className="text-white" />
                            </span>
                            {label}
                        </span>
                    ))}
                </div>
            </section>

            {/* ── Bande de confiance ── */}
            <div className="bg-white dark:bg-neutral-900 border-y border-neutral-100 dark:border-neutral-800">
                <div className="max-w-4xl mx-auto px-5 py-4 flex flex-wrap items-center justify-center gap-6 md:gap-10">
                    {TRUST_BAND.map(({ Icon, text, color }) => (
                        <div key={text} className="flex items-center gap-2">
                            <Icon size={15} className={color} />
                            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">{text}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4">

                {/* ── 4 cartes modules ── */}
                <div className="pt-14 pb-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-neutral-400 text-center mb-2">Nos services</p>
                    <h2 className="text-2xl font-light text-center text-neutral-900 dark:text-white mb-8 tracking-tight">
                        Que voulez-vous faire aujourd&apos;hui&nbsp;?
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                        {MODULES.map(({ key, label, badge, description, cta, href, Icon, iconBg, lightBg, border, hover, ctaClass, textAccent }) => (
                            <div key={key}
                                className={`group bg-white dark:bg-neutral-900 rounded-2xl border ${border} ${hover} p-6 flex flex-col gap-5 shadow-sm hover:shadow-lg transition-all duration-300`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center shadow-sm`}>
                                        <Icon size={22} className="text-white" />
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${textAccent} ${lightBg} px-3 py-1 rounded-full`}>
                                        {badge}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight mb-1.5">{label}</h3>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{description}</p>
                                </div>
                                <Link href={href}
                                    className={`inline-flex items-center gap-2 ${ctaClass} text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-md transition-all w-fit group-hover:gap-3 group-hover:shadow-lg`}
                                >
                                    {cta} <ArrowRight size={14} />
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── 4 carousels ── */}
                <DiscoveryCarousel label="Marketplace"  title="Découvertes du moment" href="/marketplace"          accentColor="text-blue-500"    emptyIcon="🛍️" products={marketplaceProducts} />
                <DiscoveryCarousel label="Immobilier"   title="Biens disponibles"     href="/category/Immobilier"  accentColor="text-emerald-600" emptyIcon="🏠"  products={immobilierProducts}  isImmobilier />
                <DiscoveryCarousel label="Pâtisserie"   title="Douceurs du jour"      href="/patisserie"           accentColor="text-pink-500"    emptyIcon="🎂"  products={patisserieProducts} />
                <DiscoveryCarousel label="Restaurants"  title="Plats à commander"     href="/restaurant"           accentColor="text-orange-500"  emptyIcon="🍽️" products={restaurantProducts} />

                {/* ── Pourquoi Mayombe Market ── */}
                <div className="mt-20 mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-neutral-400 text-center mb-2">Nos engagements</p>
                    <h2 className="text-2xl font-light text-center text-neutral-900 dark:text-white mb-8 tracking-tight">
                        Pourquoi choisir Mayombe Market&nbsp;?
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {WHY_ITEMS.map(({ Icon, title, desc, color, bg, border }) => (
                            <div key={title} className={`${bg} border ${border} rounded-2xl p-5 flex items-start gap-4`}>
                                <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
                                    <Icon size={18} className={color} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-neutral-900 dark:text-white mb-1">{title}</p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* ── Footer landing ── */}
            <LandingFooter />
        </div>
    )
}
