'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    Home, Cake, UtensilsCrossed, ShoppingBag, ArrowRight,
    ShoppingCart, User, Search, X, ShieldCheck, Truck,
    CreditCard, MapPin, MessageCircle, Star, Moon, Sun, Sparkles,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import dynamic from 'next/dynamic'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import MayombeLogo from '@/app/components/MayombeLogo'

const AuthModal = dynamic(() => import('@/app/components/AuthModal'), { ssr: false })
const supabase = getSupabaseBrowserClient()

/* ─── Types ───────────────────────────────────────────────────────────────── */
type Product = {
    id: string; name: string; price: number; img: string | null
    category: string | null; created_at?: string; views_count?: number
}
interface Props {
    marketplaceProducts: Product[]; immobilierProducts: Product[]
    patisserieProducts: Product[]; restaurantProducts: Product[]
}

/* ─── Constants ───────────────────────────────────────────────────────────── */
const FILTERS = [
    { key: 'immobilier',  Icon: Home,            color: 'bg-emerald-500', ring: 'ring-emerald-300', category: 'Immobilier',              label: 'Immobilier'  },
    { key: 'patisserie',  Icon: Cake,            color: 'bg-pink-500',    ring: 'ring-pink-300',    category: 'Pâtisserie & Traiteur',   label: 'Pâtisserie'  },
    { key: 'restaurant',  Icon: UtensilsCrossed, color: 'bg-orange-500',  ring: 'ring-orange-300',  category: 'Alimentation & Boissons', label: 'Restaurants' },
    { key: 'marketplace', Icon: ShoppingBag,     color: 'bg-blue-500',    ring: 'ring-blue-300',    category: null,                      label: 'Marketplace' },
] as const
type FilterKey = typeof FILTERS[number]['key']

const MODULES = [
    {
        key: 'immobilier', label: 'Immobilier', badge: 'Biens disponibles',
        description: 'Appartements, villas, terrains à Brazzaville et Pointe-Noire.',
        cta: 'Explorer les biens', href: '/category/Immobilier',
        Icon: Home, gradient: 'from-emerald-500 to-teal-700', glow: '#10B981',
    },
    {
        key: 'patisserie', label: 'Pâtisserie', badge: 'Sur mesure',
        description: 'Gâteaux artisanaux, layer cakes et pains livrés chez vous.',
        cta: 'Voir les créations', href: '/patisserie',
        Icon: Cake, gradient: 'from-rose-500 to-pink-700', glow: '#F43F5E',
    },
    {
        key: 'restaurant', label: 'Restaurants', badge: 'Plats du jour',
        description: 'Cuisine congolaise, burgers, grillades livrés chez vous.',
        cta: 'Commander un plat', href: '/restaurant',
        Icon: UtensilsCrossed, gradient: 'from-orange-500 to-amber-600', glow: '#F97316',
    },
    {
        key: 'marketplace', label: 'Marketplace', badge: 'Boutique en ligne',
        description: 'Mode, high-tech, maison et beauté. Achetez et vendez.',
        cta: 'Visiter la boutique', href: '/marketplace',
        Icon: ShoppingBag, gradient: 'from-blue-500 to-indigo-600', glow: '#3B82F6',
    },
] as const

const TRUST_ITEMS = [
    { Icon: MapPin,        text: 'Brazzaville & Pointe-Noire', color: '#10B981' },
    { Icon: CreditCard,    text: 'Paiement Mobile Money',      color: '#CA8A04' },
    { Icon: Truck,         text: 'Livraison locale',            color: '#3B82F6' },
    { Icon: ShieldCheck,   text: 'Vendeurs vérifiés',           color: '#A855F7' },
]

const WHY_ITEMS = [
    { Icon: ShieldCheck,   title: 'Vendeurs vérifiés',     desc: 'Chaque vendeur est contrôlé et approuvé par notre équipe avant de vendre.',  accent: '#CA8A04' },
    { Icon: CreditCard,    title: 'Paiement Mobile Money', desc: 'Payez via MTN Money ou Airtel Money, sans carte bancaire.',                   accent: '#10B981' },
    { Icon: Truck,         title: 'Livraison locale',       desc: 'Nos livreurs assurent la livraison à Brazzaville et Pointe-Noire.',           accent: '#3B82F6' },
    { Icon: MessageCircle, title: 'Support 7j/7',           desc: 'Une équipe réactive disponible 7j/7 pour répondre à vos questions.',          accent: '#A855F7' },
]

const PLACEHOLDERS = [
    'Rechercher une propriété, une douceur, un plat…',
    'Trouver un appartement à Brazzaville…',
    'Commander un gâteau sur mesure…',
    'Découvrir des plats congolais…',
    'Chercher un produit dans la marketplace…',
]

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function isNewProduct(created_at?: string) {
    if (!created_at) return false
    return Date.now() - new Date(created_at).getTime() < 14 * 24 * 60 * 60 * 1000
}
function formatPrice(price: number, isImmobilier = false) {
    if (isImmobilier && (!price || price === 0)) return 'Prix sur demande'
    return `${(price || 0).toLocaleString('fr-FR')} F`
}

/* ─── Search Bar ──────────────────────────────────────────────────────────── */
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
                <div className="flex items-center rounded-2xl border border-white/15 px-5 py-4 gap-3 hover:border-white/25 transition-all duration-300"
                    style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)' }}
                >
                    <Search size={17} className="text-white/50 flex-shrink-0" />
                    <input
                        type="text" value={query}
                        onChange={e => setQuery(e.target.value)}
                        onFocus={() => results.length > 0 && setShowDropdown(true)}
                        placeholder={placeholder}
                        className="flex-1 bg-transparent text-sm text-white placeholder:text-white/35 outline-none min-w-0"
                        style={{ fontFamily: "'Jost', sans-serif" }}
                    />
                    {query && (
                        <button type="button" onClick={() => { setQuery(''); setResults([]); setShowDropdown(false) }}>
                            <X size={15} className="text-white/35 hover:text-white transition-colors" />
                        </button>
                    )}
                    <div className="w-px h-5 bg-white/15 flex-shrink-0" />
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {FILTERS.map(({ key, Icon, color, ring, label }) => (
                            <button key={key} type="button" title={label}
                                onClick={() => setActiveFilter(prev => prev === key ? null : key)}
                                className={`w-7 h-7 rounded-full ${color} flex items-center justify-center transition-all cursor-pointer ${
                                    activeFilter === key ? `ring-2 ${ring} ring-offset-1 ring-offset-transparent scale-110` : 'opacity-50 hover:opacity-90'
                                }`}
                            >
                                <Icon size={12} className="text-white" />
                            </button>
                        ))}
                    </div>
                    <button type="submit" className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer hover:scale-105"
                        style={{ background: 'linear-gradient(135deg, #CA8A04, #F59E0B)', boxShadow: '0 4px 12px rgba(202,138,4,0.4)' }}
                    >
                        <ArrowRight size={15} className="text-white" />
                    </button>
                </div>
            </form>

            {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl border border-white/10 overflow-hidden z-50"
                    style={{ background: 'rgba(15,12,10,0.95)', backdropFilter: 'blur(24px)' }}
                >
                    {loading ? (
                        <p className="px-5 py-6 text-center text-sm text-white/35">Recherche en cours…</p>
                    ) : results.length === 0 ? (
                        <p className="px-5 py-6 text-center text-sm text-white/35">Aucun résultat pour «&nbsp;{query}&nbsp;»</p>
                    ) : (
                        <>
                            {results.map((r, i) => (
                                <Link key={r.id} href={`/product/${r.id}`} onClick={() => setShowDropdown(false)}
                                    className={`flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors no-underline ${i > 0 ? 'border-t border-white/5' : ''}`}
                                >
                                    <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                        {r.img ? <img src={r.img} alt={r.name} className="w-full h-full object-cover" />
                                            : <ShoppingBag size={16} className="text-white/25 m-auto mt-2.5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-white truncate">{r.name}</p>
                                        <p className="text-[11px] text-white/35 truncate">{r.category}</p>
                                    </div>
                                    <p className="text-sm font-bold flex-shrink-0" style={{ color: '#CA8A04' }}>
                                        {formatPrice(r.price, r.category === 'Immobilier')}
                                    </p>
                                </Link>
                            ))}
                            <div className="border-t border-white/5 px-4 py-2.5">
                                <button onClick={() => handleSubmit()} className="text-xs font-bold hover:underline cursor-pointer" style={{ color: '#CA8A04' }}>
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

/* ─── 3D Module Card ──────────────────────────────────────────────────────── */
function ModuleCard({ mod }: { mod: typeof MODULES[number] }) {
    const [hovered, setHovered] = useState(false)
    const { label, badge, description, cta, href, Icon, gradient, glow } = mod

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                transform: hovered
                    ? 'perspective(1000px) rotateX(-3deg) rotateY(4deg) translateZ(10px) scale(1.02)'
                    : 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale(1)',
                transition: 'transform 0.45s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.45s ease',
                boxShadow: hovered
                    ? `0 30px 70px -10px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.12), 0 0 40px -10px ${glow}40`
                    : '0 4px 20px -2px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(20px)',
            }}
            className="relative rounded-3xl overflow-hidden cursor-pointer"
        >
            {/* Top gradient line */}
            <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${gradient} opacity-60`} />

            {/* Ambient glow orb */}
            <div
                className={`absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl transition-opacity duration-500 bg-gradient-to-br ${gradient}`}
                style={{ opacity: hovered ? 0.18 : 0.07 }}
            />

            <div className="relative p-6 flex flex-col gap-4 h-full">
                <div className="flex items-start justify-between">
                    <div
                        className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}
                        style={{
                            boxShadow: `0 8px 24px ${glow}40`,
                            transform: hovered ? 'translateY(-2px) scale(1.05)' : 'translateY(0) scale(1)',
                            transition: 'transform 0.45s cubic-bezier(0.23, 1, 0.32, 1)',
                        }}
                    >
                        <Icon size={22} className="text-white" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/35 border border-white/10 px-3 py-1 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.04)' }}>
                        {badge}
                    </span>
                </div>
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-white tracking-tight mb-2" style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}>
                        {label}
                    </h3>
                    <p className="text-sm text-white/45 leading-relaxed">{description}</p>
                </div>
                <Link href={href}
                    className={`inline-flex items-center gap-2 bg-gradient-to-r ${gradient} text-white text-xs font-bold px-5 py-2.5 rounded-full w-fit transition-all duration-200 hover:gap-3 hover:shadow-lg cursor-pointer`}
                    onClick={e => e.stopPropagation()}
                    style={{ boxShadow: `0 4px 16px ${glow}30` }}
                >
                    {cta} <ArrowRight size={12} />
                </Link>
            </div>
        </div>
    )
}

/* ─── 3D Product Card ─────────────────────────────────────────────────────── */
function ProductCard({ p, isImmobilier }: { p: Product; accentColor: string; isImmobilier?: boolean }) {
    const isNew = isNewProduct(p.created_at)
    const isPopular = (p.views_count || 0) > 50
    const [hovered, setHovered] = useState(false)

    return (
        <Link href={`/product/${p.id}`}
            className="flex-shrink-0 w-48 snap-start no-underline block cursor-pointer"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div
                style={{
                    transform: hovered
                        ? 'perspective(800px) rotateX(-5deg) translateY(-8px) scale(1.04)'
                        : 'perspective(800px) rotateX(0deg) translateY(0px) scale(1)',
                    transition: 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
                    boxShadow: hovered
                        ? '0 24px 50px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)'
                        : '0 2px 10px rgba(0,0,0,0.2)',
                }}
                className="relative w-full aspect-square rounded-2xl overflow-hidden bg-stone-900"
            >
                {p.img
                    ? <img src={p.img} alt={p.name}
                        className="w-full h-full object-cover transition-transform duration-700"
                        style={{ transform: hovered ? 'scale(1.1)' : 'scale(1)' }}
                        loading="lazy"
                      />
                    : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900">
                        <ShoppingBag size={32} className="text-white/15" />
                      </div>
                }

                {/* Glass info overlay */}
                <div className="absolute inset-x-0 bottom-0 pt-10 px-3 pb-3"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)' }}
                >
                    <p className="text-xs font-semibold text-white truncate leading-snug">{p.name}</p>
                    <p className="text-sm font-black mt-0.5" style={{ color: '#F59E0B' }}>
                        {formatPrice(p.price, isImmobilier)}
                    </p>
                </div>

                {/* Gold shimmer on hover */}
                <div className="absolute inset-0 transition-opacity duration-400 pointer-events-none"
                    style={{ background: 'linear-gradient(135deg, rgba(202,138,4,0.12) 0%, transparent 60%)', opacity: hovered ? 1 : 0 }}
                />

                {/* Badges */}
                {isNew && !isPopular && (
                    <span className="absolute top-2 left-2 text-black text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full"
                        style={{ background: '#CA8A04' }}>
                        Nouveau
                    </span>
                )}
                {isPopular && (
                    <span className="absolute top-2 left-2 text-white text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-white/20"
                        style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                        <Star size={8} className="fill-amber-400 text-amber-400" /> Populaire
                    </span>
                )}
            </div>
        </Link>
    )
}

/* ─── Discovery Carousel ──────────────────────────────────────────────────── */
function DiscoveryCarousel({ label, title, href, accentColor, emptyIcon, products, isImmobilier }: {
    label: string; title: string; href: string; accentColor: string
    emptyIcon: string; products: Product[]; isImmobilier?: boolean
}) {
    return (
        <div className="mt-20">
            <div className="flex items-end justify-between mb-6">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-white/30 mb-1">{label}</p>
                    <h2 className="text-2xl font-light text-white tracking-tight" style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}>
                        {title}
                    </h2>
                </div>
                <Link href={href} className={`text-[11px] font-bold ${accentColor} hover:underline uppercase tracking-widest flex items-center gap-1 mb-1 cursor-pointer`}>
                    Voir tout <ArrowRight size={12} />
                </Link>
            </div>

            {products.length === 0 ? (
                <div className="flex items-center gap-3 text-white/30 text-sm py-8 px-5 rounded-2xl border border-dashed border-white/10"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <span className="text-3xl opacity-30">{emptyIcon}</span>
                    <div>
                        <p className="font-semibold text-white/35">Bientôt disponible</p>
                        <p className="text-xs text-white/20 mt-0.5">Les premiers produits arrivent prochainement.</p>
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

/* ─── Footer ──────────────────────────────────────────────────────────────── */
function LandingFooter() {
    return (
        <footer className="border-t border-white/8 mt-20" style={{ background: '#080604' }}>
            <div className="max-w-5xl mx-auto px-5 py-12">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
                    <div>
                        <MayombeLogo />
                        <p className="text-xs text-white/35 leading-relaxed mt-3 max-w-[220px]">
                            Votre plateforme congolaise pour acheter, commander, vendre et trouver des biens.
                        </p>
                        <p className="text-xs text-white/25 mt-3">Brazzaville &amp; Pointe-Noire</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3">Liens utiles</p>
                        <div className="flex flex-col gap-2">
                            {[
                                { label: 'À propos', href: '/about' },
                                { label: "Conditions d'utilisation", href: '/terms' },
                                { label: 'Confidentialité', href: '/privacy' },
                                { label: 'Contact', href: '/contact' },
                            ].map(l => (
                                <Link key={l.href} href={l.href} className="text-xs text-white/35 hover:text-amber-400 transition-colors no-underline">
                                    {l.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3">Nos zones</p>
                        <div className="flex gap-2 mb-4">
                            {['Brazzaville', 'Pointe-Noire'].map(z => (
                                <span key={z} className="text-[11px] font-semibold text-white/50 px-3 py-1 rounded-full border border-white/10">
                                    {z}
                                </span>
                            ))}
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2">Contact</p>
                        <a href="mailto:contact@mayombe-market.com" className="text-xs hover:underline" style={{ color: '#CA8A04' }}>
                            contact@mayombe-market.com
                        </a>
                    </div>
                </div>
                <div className="border-t border-white/8 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p className="text-[11px] text-white/20">© {new Date().getFullYear()} Mayombe Market. Tous droits réservés.</p>
                    <div className="flex gap-4">
                        {['Marketplace', 'Immobilier', 'Pâtisserie', 'Restaurants'].map(m => (
                            <span key={m} className="text-[11px] text-white/20">{m}</span>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    )
}

/* ─── Page principale ─────────────────────────────────────────────────────── */
export default function LandingPageClient({ marketplaceProducts, immobilierProducts, patisserieProducts, restaurantProducts }: Props) {
    const { user, profile } = useAuth()
    const [showAuth, setShowAuth] = useState(false)
    const [isDark, setIsDark] = useState(false)
    const firstName = profile?.first_name || null

    useEffect(() => { setIsDark(document.documentElement.classList.contains('dark')) }, [])

    const toggleDark = () => {
        const next = !isDark
        setIsDark(next)
        document.documentElement.classList.toggle('dark', next)
        localStorage.setItem('darkMode', String(next))
    }

    return (
        <>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,600;0,700;1,400&family=Jost:wght@300;400;500;600&display=swap');`}</style>

            <div className="min-h-screen" style={{ fontFamily: "'Jost', system-ui, sans-serif", background: '#0C0A09' }}>

                {/* ════════════════════════════════════════════════════════════
                    HERO — Dark cinematic
                ════════════════════════════════════════════════════════════ */}
                <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: '#0C0A09' }}>

                    {/* Animated ambient orbs */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
                        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full animate-pulse"
                            style={{ background: 'radial-gradient(circle, rgba(202,138,4,0.18) 0%, transparent 70%)', animationDuration: '5s' }} />
                        <div className="absolute top-1/2 -right-48 w-[400px] h-[400px] rounded-full animate-pulse"
                            style={{ background: 'radial-gradient(circle, rgba(202,138,4,0.10) 0%, transparent 70%)', animationDuration: '7s', animationDelay: '1.5s' }} />
                        <div className="absolute -bottom-20 left-1/3 w-80 h-80 rounded-full animate-pulse"
                            style={{ background: 'radial-gradient(circle, rgba(120,53,15,0.15) 0%, transparent 70%)', animationDuration: '6s', animationDelay: '3s' }} />
                        {/* Subtle grid */}
                        <div className="absolute inset-0"
                            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px', opacity: 1 }} />
                    </div>

                    {/* Header */}
                    <header className="relative z-10 flex items-center justify-between px-5 py-5 max-w-5xl mx-auto w-full">
                        <Link href="/" className="no-underline hover:opacity-90 transition-opacity">
                            <MayombeLogo />
                        </Link>
                        <div className="flex items-center gap-3">
                            <button onClick={toggleDark}
                                className="w-9 h-9 rounded-full flex items-center justify-center border border-white/12 text-white/40 hover:text-amber-400 hover:border-amber-500/30 transition-all cursor-pointer"
                                style={{ background: 'rgba(255,255,255,0.05)' }}
                            >
                                {isDark ? <Sun size={16} /> : <Moon size={16} />}
                            </button>
                            {user ? (
                                <>
                                    <Link href="/cart" className="text-white/40 hover:text-amber-400 transition-colors">
                                        <ShoppingCart size={20} />
                                    </Link>
                                    <Link
                                        href={profile?.role === 'vendor' ? '/vendor/dashboard' : '/account/dashboard'}
                                        className="flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white transition-colors no-underline"
                                    >
                                        {profile?.avatar_url
                                            ? <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-white/20" />
                                            : <div className="w-8 h-8 rounded-full flex items-center justify-center border border-amber-500/30"
                                                style={{ background: 'rgba(202,138,4,0.15)' }}>
                                                <User size={14} style={{ color: '#CA8A04' }} />
                                              </div>
                                        }
                                        <span className="hidden sm:block">{firstName ? `Bonjour, ${firstName}` : 'Mon compte'}</span>
                                    </Link>
                                </>
                            ) : (
                                <button onClick={() => setShowAuth(true)}
                                    className="text-sm font-bold text-white/80 border border-white/15 hover:border-white/30 hover:text-white px-4 py-2 rounded-full transition-all backdrop-blur-sm cursor-pointer"
                                    style={{ background: 'rgba(255,255,255,0.05)' }}
                                >
                                    Connexion
                                </button>
                            )}
                        </div>
                    </header>

                    {/* Hero content */}
                    <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16 text-center max-w-3xl mx-auto w-full">

                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-8 border border-amber-500/20"
                            style={{ background: 'rgba(202,138,4,0.08)', color: '#CA8A04' }}>
                            <Sparkles size={10} />
                            Brazzaville &amp; Pointe-Noire
                        </div>

                        {/* Title */}
                        <h1 className="font-bold tracking-tight text-white leading-tight mb-5"
                            style={{ fontFamily: "'Bodoni Moda', Georgia, serif", fontSize: 'clamp(2.2rem, 6vw, 4rem)' }}>
                            Trouvez tout au Congo,<br />
                            <span className="italic" style={{ background: 'linear-gradient(135deg, #CA8A04 0%, #F59E0B 50%, #CA8A04 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                en un seul endroit
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-base max-w-lg mx-auto leading-relaxed mb-10 font-light" style={{ color: 'rgba(255,255,255,0.45)' }}>
                            Immobilier, restauration, pâtisserie et marketplace à Brazzaville et Pointe-Noire.
                        </p>

                        <SearchBar />

                        {/* Filter hints */}
                        <div className="flex items-center justify-center gap-5 mt-6 flex-wrap">
                            {FILTERS.map(({ key, Icon, color, label }) => (
                                <span key={key} className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.28)' }}>
                                    <span className={`w-4 h-4 rounded-full ${color} inline-flex items-center justify-center opacity-60`}>
                                        <Icon size={9} className="text-white" />
                                    </span>
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Bottom fade */}
                    <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
                        style={{ background: 'linear-gradient(to bottom, transparent, #0C0A09)' }} />
                </div>

                {/* ════════════════════════════════════════════════════════════
                    CONTENT
                ════════════════════════════════════════════════════════════ */}
                <div style={{ background: '#0C0A09' }}>

                    {/* Trust band */}
                    <div className="border-y border-white/6">
                        <div className="max-w-4xl mx-auto px-5 py-4 flex flex-wrap items-center justify-center gap-6 md:gap-10">
                            {TRUST_ITEMS.map(({ Icon, text, color }) => (
                                <div key={text} className="flex items-center gap-2">
                                    <Icon size={15} style={{ color }} />
                                    <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>{text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="max-w-4xl mx-auto px-4 pb-20">

                        {/* 4 module cards */}
                        <div className="pt-16">
                            <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-center mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>Nos services</p>
                            <h2 className="text-2xl font-light text-center text-white mb-10 tracking-tight" style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}>
                                Que voulez-vous faire aujourd&apos;hui&nbsp;?
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                                {MODULES.map(mod => <ModuleCard key={mod.key} mod={mod} />)}
                            </div>
                        </div>

                        {/* Carousels */}
                        <DiscoveryCarousel label="Marketplace"  title="Découvertes du moment" href="/marketplace"          accentColor="text-blue-400"    emptyIcon="🛍️" products={marketplaceProducts} />
                        <DiscoveryCarousel label="Immobilier"   title="Biens disponibles"     href="/category/Immobilier"  accentColor="text-emerald-400" emptyIcon="🏠"  products={immobilierProducts}  isImmobilier />
                        <DiscoveryCarousel label="Pâtisserie"   title="Douceurs du jour"      href="/patisserie"           accentColor="text-pink-400"    emptyIcon="🎂"  products={patisserieProducts} />
                        <DiscoveryCarousel label="Restaurants"  title="Plats à commander"     href="/restaurant"           accentColor="text-orange-400"  emptyIcon="🍽️" products={restaurantProducts} />

                        {/* Why section */}
                        <div className="mt-20 mb-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-center mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>Nos engagements</p>
                            <h2 className="text-2xl font-light text-center text-white mb-10 tracking-tight" style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }}>
                                Pourquoi choisir Mayombe Market&nbsp;?
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {WHY_ITEMS.map(({ Icon, title, desc, accent }) => (
                                    <div key={title}
                                        className="rounded-2xl p-5 flex items-start gap-4 border border-white/6 transition-all duration-200 hover:border-white/12"
                                        style={{ background: 'rgba(255,255,255,0.03)' }}
                                    >
                                        <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                                            style={{ background: `${accent}18`, border: `1px solid ${accent}25` }}>
                                            <Icon size={18} style={{ color: accent }} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white mb-1">{title}</p>
                                            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>{desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

                <LandingFooter />
                {showAuth && <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />}
            </div>
        </>
    )
}
