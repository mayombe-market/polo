'use client'

/**
 * Dashboard vendeur Pâtisserie — style Uber Eats Merchant.
 * Affiché quand profile.vendor_type === 'patisserie'.
 */

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getVendorOrders } from '@/app/actions/orders'
import { updateProfile } from '@/app/actions/profile'
import {
    LayoutDashboard, UtensilsCrossed, ShoppingBag, Star, Settings,
    Navigation, Clock, Upload, Check, Loader2, Plus, Minus,
    ChevronRight, Cake, MapPin, Phone, Bike, Timer, Eye,
    Package, TrendingUp, Camera, AlertCircle, X, ToggleLeft,
    ToggleRight, Store, ShieldCheck, DollarSign, ChevronDown,
    ArrowUpRight, Bell, Wallet,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Page = 'home' | 'menu' | 'orders' | 'reviews' | 'settings'

interface Props {
    profile: any
    user: any
    products: any[] | null
    productCount: number | null
}

function formatPrice(n: number) {
    return n.toLocaleString('fr-FR') + ' FCFA'
}

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })
}

// ─── Haversine (pour calcul distance GPS) ────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.asin(Math.sqrt(a))
}

// ═══════════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT — Barre de navigation latérale / bas mobile
// ═══════════════════════════════════════════════════════════════════════════

const NAV_ITEMS: { id: Page; label: string; icon: React.ElementType }[] = [
    { id: 'home',     label: 'Accueil',    icon: LayoutDashboard },
    { id: 'menu',     label: 'Menu',       icon: UtensilsCrossed },
    { id: 'orders',   label: 'Commandes',  icon: ShoppingBag },
    { id: 'reviews',  label: 'Avis',       icon: Star },
    { id: 'settings', label: 'Paramètres', icon: Settings },
]

// ═══════════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT — HomePage
// ═══════════════════════════════════════════════════════════════════════════

function HomePage({ profile, products, orders, onToggleOpen, toggling }: {
    profile: any; products: any[] | null; orders: any[]; onToggleOpen: () => void; toggling: boolean
}) {
    const shopName = profile?.shop_name || profile?.store_name || 'Ma pâtisserie'
    const isOpen = profile?.is_open !== false
    const coverImg = profile?.cover_image || null
    const hasGps = !!(profile?.latitude && profile?.longitude)
    const hasHours = !!profile?.opening_hours_text
    const hasCover = !!profile?.cover_image
    const hasPhone = !!profile?.phone

    const todayOrders = orders.filter(o => {
        const d = new Date(o.created_at)
        const today = new Date()
        return d.toDateString() === today.toDateString()
    })
    const todayRevenue = todayOrders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0)
    const weekOrders = orders.filter(o => {
        const d = new Date(o.created_at)
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7)
        return d >= cutoff
    })
    const weekRevenue = weekOrders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0)

    const setupItems = [
        { label: 'Nom de la boutique',   done: !!(profile?.shop_name || profile?.store_name) },
        { label: 'Image de couverture',  done: hasCover },
        { label: 'Position GPS',         done: hasGps },
        { label: "Horaires d'ouverture", done: hasHours },
        { label: 'Téléphone',            done: hasPhone },
    ]
    const setupDone = setupItems.filter(s => s.done).length
    const setupPct = Math.round((setupDone / setupItems.length) * 100)

    return (
        <div className="space-y-4 pb-4">
            {/* ── Cover preview + nom ── */}
            <div className="relative rounded-3xl overflow-hidden" style={{ height: 180 }}>
                {coverImg
                    ? <Image src={coverImg} alt={shopName} fill className="object-cover" sizes="600px" />
                    : <div className="w-full h-full bg-gradient-to-br from-rose-700 via-rose-600 to-pink-700 flex items-center justify-center">
                        <Cake className="w-16 h-16 text-white/30" />
                      </div>
                }
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                    <div>
                        <p className="text-white font-black text-xl leading-tight">{shopName}</p>
                        {profile?.city && <p className="text-white/70 text-xs mt-0.5 flex items-center gap-1"><MapPin size={10} />{profile.city}</p>}
                    </div>
                    <Link href={`/patisserie/${profile?.id}`} target="_blank"
                        className="flex items-center gap-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full hover:bg-white/30 transition-colors"
                    >
                        <Eye size={12} /> Voir
                    </Link>
                </div>
            </div>

            {/* ── Open/Closed toggle ── */}
            <div className={`rounded-3xl p-5 flex items-center justify-between transition-colors ${isOpen ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div>
                    <p className="font-black text-base">{isOpen ? '🟢 Boutique ouverte' : '🔴 Boutique fermée'}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                        {isOpen ? 'Les clients peuvent commander' : 'Les clients voient "Fermé"'}
                    </p>
                </div>
                <button
                    onClick={onToggleOpen}
                    disabled={toggling}
                    className={`relative w-14 h-7 rounded-full transition-all duration-300 flex items-center ${isOpen ? 'bg-green-500' : 'bg-neutral-300'} disabled:opacity-60`}
                >
                    <div className={`absolute w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${isOpen ? 'left-[30px]' : 'left-0.5'}`} />
                </button>
            </div>

            {/* ── Stats rapides ── */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-3xl p-4 border border-neutral-100 shadow-sm">
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Aujourd'hui</p>
                    <p className="text-2xl font-black text-neutral-900 mt-1">{todayOrders.length}</p>
                    <p className="text-xs text-neutral-500">commande{todayOrders.length !== 1 ? 's' : ''}</p>
                    <p className="text-xs font-bold text-orange-500 mt-1">{formatPrice(todayRevenue)}</p>
                </div>
                <div className="bg-white rounded-3xl p-4 border border-neutral-100 shadow-sm">
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Cette semaine</p>
                    <p className="text-2xl font-black text-neutral-900 mt-1">{weekOrders.length}</p>
                    <p className="text-xs text-neutral-500">commande{weekOrders.length !== 1 ? 's' : ''}</p>
                    <p className="text-xs font-bold text-orange-500 mt-1">{formatPrice(weekRevenue)}</p>
                </div>
            </div>

            {/* ── Setup checklist ── */}
            {setupPct < 100 && (
                <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-black text-sm">Complétez votre profil</h3>
                        <span className="text-xs font-bold text-orange-500">{setupPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-100 rounded-full mb-4 overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${setupPct}%` }} />
                    </div>
                    <div className="space-y-2">
                        {setupItems.map(item => (
                            <div key={item.label} className="flex items-center gap-2.5">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-green-100' : 'bg-neutral-100'}`}>
                                    {item.done
                                        ? <Check size={10} className="text-green-600" />
                                        : <AlertCircle size={10} className="text-neutral-400" />
                                    }
                                </div>
                                <span className={`text-xs ${item.done ? 'text-neutral-400 line-through' : 'text-neutral-700 font-medium'}`}>
                                    {item.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Dernières commandes ── */}
            <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-neutral-50 flex items-center justify-between">
                    <h3 className="font-black text-sm">Dernières commandes</h3>
                    <span className="text-xs text-neutral-400">{orders.length} au total</span>
                </div>
                {orders.length === 0 ? (
                    <div className="py-8 text-center">
                        <Package size={28} className="text-neutral-200 mx-auto mb-2" />
                        <p className="text-xs text-neutral-400">Aucune commande pour le moment</p>
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-50">
                        {orders.slice(0, 5).map((order: any) => (
                            <div key={order.id} className="px-5 py-3.5 flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    order.status === 'delivered' ? 'bg-green-400' :
                                    order.status === 'processing' ? 'bg-blue-400' :
                                    order.status === 'cancelled' ? 'bg-red-400' : 'bg-amber-400'
                                }`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-neutral-800 truncate">
                                        {order.customer_name || order.district || 'Client'}
                                    </p>
                                    <p className="text-[10px] text-neutral-400">{formatDate(order.created_at)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-neutral-900">{formatPrice(order.total_amount || 0)}</p>
                                    <p className="text-[10px] text-neutral-400">{order.items?.length || 0} article{(order.items?.length || 0) > 1 ? 's' : ''}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT — OrdersPage
// ═══════════════════════════════════════════════════════════════════════════

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    paid:           { label: 'Payé',       color: 'bg-blue-100 text-blue-700' },
    processing:     { label: 'En cours',   color: 'bg-amber-100 text-amber-700' },
    shipped:        { label: 'Livré',      color: 'bg-purple-100 text-purple-700' },
    delivered:      { label: 'Terminé',    color: 'bg-green-100 text-green-700' },
    cancelled:      { label: 'Annulé',     color: 'bg-red-100 text-red-700' },
    rejected:       { label: 'Rejeté',     color: 'bg-red-100 text-red-700' },
}

function OrdersPage({ orders }: { orders: any[] }) {
    const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all')

    const filtered = orders.filter(o => {
        if (filter === 'active') return ['paid', 'processing', 'shipped'].includes(o.status)
        if (filter === 'done') return ['delivered', 'cancelled', 'rejected'].includes(o.status)
        return true
    })

    return (
        <div className="space-y-4">
            {/* Filtres */}
            <div className="flex gap-2">
                {(['all', 'active', 'done'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${filter === f ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-500 border border-neutral-200 hover:border-neutral-400'}`}
                    >
                        {f === 'all' ? 'Toutes' : f === 'active' ? 'En cours' : 'Terminées'}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-3xl border border-neutral-100 py-16 text-center">
                    <Package size={36} className="text-neutral-200 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-neutral-400">Aucune commande</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((order: any) => {
                        const s = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-neutral-100 text-neutral-600' }
                        return (
                            <div key={order.id} className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <p className="font-black text-sm text-neutral-900">
                                            {order.customer_name || order.district || 'Client'}
                                        </p>
                                        <p className="text-xs text-neutral-400 mt-0.5">{formatDate(order.created_at)}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${s.color}`}>{s.label}</span>
                                </div>

                                {/* Articles */}
                                {order.items?.length > 0 && (
                                    <div className="space-y-1 mb-3">
                                        {order.items.map((item: any, i: number) => (
                                            <div key={i} className="flex justify-between text-xs">
                                                <span className="text-neutral-600">{item.quantity}× {item.name}</span>
                                                <span className="font-semibold text-neutral-800">{formatPrice(item.price * item.quantity)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="border-t border-neutral-50 pt-3 flex items-center justify-between">
                                    <div className="text-xs text-neutral-400">
                                        <span>{order.city}</span>
                                        {order.district && <span>, {order.district}</span>}
                                    </div>
                                    <p className="font-black text-sm text-orange-500">{formatPrice(order.total_amount || 0)}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT — ReviewsPage
// ═══════════════════════════════════════════════════════════════════════════

function ReviewsPage({ sellerId }: { sellerId: string }) {
    const [reviews, setReviews] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = getSupabaseBrowserClient()

    useEffect(() => {
        supabase.rpc('get_seller_reviews', { p_seller_id: sellerId })
            .then(({ data }) => { setReviews(data || []) })
            .then(() => setLoading(false), () => setLoading(false))
    }, [sellerId, supabase])

    const avg = reviews.length > 0
        ? Math.round(reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length * 10) / 10
        : 0

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-rose-400" />
        </div>
    )

    return (
        <div className="space-y-4">
            {reviews.length === 0 ? (
                <div className="bg-white rounded-3xl border border-neutral-100 py-16 text-center">
                    <Star size={36} className="text-neutral-200 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-neutral-400">Aucun avis pour le moment</p>
                    <p className="text-xs text-neutral-300 mt-1">Les avis apparaîtront après vos premières commandes</p>
                </div>
            ) : (
                <>
                    {/* Résumé */}
                    <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-5 flex items-center gap-6">
                        <div className="text-center flex-shrink-0">
                            <p className="text-5xl font-black text-neutral-900 leading-none">{avg.toFixed(1)}</p>
                            <div className="flex justify-center gap-0.5 mt-2">
                                {[1,2,3,4,5].map(s => (
                                    <Star key={s} size={14} className={s <= Math.round(avg) ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'} />
                                ))}
                            </div>
                            <p className="text-xs text-neutral-400 mt-1">{reviews.length} avis</p>
                        </div>
                        <div className="flex-1 space-y-1.5">
                            {[5,4,3,2,1].map(star => {
                                const count = reviews.filter(r => Math.round(r.rating) === star).length
                                const pct = (count / reviews.length) * 100
                                return (
                                    <div key={star} className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-neutral-400 w-3">{star}</span>
                                        <Star size={10} className="fill-amber-400 text-amber-400 flex-shrink-0" />
                                        <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-[10px] text-neutral-400 w-4">{count}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Avis individuels */}
                    <div className="space-y-3">
                        {reviews.map((review: any, i: number) => (
                            <div key={review.id || i} className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {review.user_avatar
                                                ? <img src={review.user_avatar} alt="" className="w-full h-full object-cover" />
                                                : <span className="text-sm font-black text-rose-400">{(review.user_name || 'C')[0].toUpperCase()}</span>
                                            }
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-neutral-800">{review.user_name || 'Client'}</p>
                                            <div className="flex gap-0.5 mt-0.5">
                                                {[1,2,3,4,5].map(s => (
                                                    <Star key={s} size={11} className={s <= Math.round(review.rating) ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-neutral-400">
                                        {review.created_at ? formatDate(review.created_at) : ''}
                                    </span>
                                </div>
                                {review.product_name && (
                                    <p className="text-[10px] font-bold text-rose-500 mb-1.5">📦 {review.product_name}</p>
                                )}
                                {review.comment && (
                                    <p className="text-sm text-neutral-600 leading-relaxed">"{review.comment}"</p>
                                )}
                                <div className="mt-2">
                                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✓ Achat vérifié</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT — MenuPage (produits)
// ═══════════════════════════════════════════════════════════════════════════

function MenuPage({ products, sellerId }: { products: any[] | null; sellerId: string }) {
    const supabase = getSupabaseBrowserClient()
    const [items, setItems] = useState<any[]>(products || [])
    const [deleting, setDeleting] = useState<string | null>(null)

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer ce produit ?')) return
        setDeleting(id)
        const { error } = await supabase.from('products').delete().eq('id', id)
        if (error) { toast.error('Erreur suppression'); setDeleting(null); return }
        setItems(prev => prev.filter(p => p.id !== id))
        toast.success('Produit supprimé')
        setDeleting(null)
    }

    const grouped: Record<string, any[]> = {}
    for (const p of items) {
        const cat = p.subcategory || 'Autres'
        if (!grouped[cat]) grouped[cat] = []
        grouped[cat].push(p)
    }

    return (
        <div className="space-y-4">
            <Link href="/vendor/products/add"
                className="flex items-center justify-center gap-2 w-full bg-rose-500 hover:bg-rose-600 text-white font-black text-sm py-4 rounded-2xl transition-colors shadow-sm shadow-rose-200"
            >
                <Plus size={16} /> Ajouter un article au menu
            </Link>

            {items.length === 0 ? (
                <div className="bg-white rounded-3xl border border-neutral-100 py-16 text-center">
                    <Cake size={36} className="text-neutral-200 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-neutral-400">Menu vide</p>
                    <p className="text-xs text-neutral-300 mt-1">Ajoutez vos premières créations</p>
                </div>
            ) : (
                Object.entries(grouped).map(([cat, prods]) => (
                    <div key={cat} className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 bg-neutral-50 border-b border-neutral-100">
                            <h3 className="font-black text-xs uppercase tracking-widest text-neutral-500">{cat}</h3>
                        </div>
                        <div className="divide-y divide-neutral-50">
                            {prods.map((product: any) => (
                                <div key={product.id} className="flex items-center gap-4 px-5 py-4">
                                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-rose-50 flex-shrink-0">
                                        {product.img
                                            ? <Image src={product.img} alt={product.name} fill className="object-cover" sizes="64px" />
                                            : <div className="w-full h-full flex items-center justify-center"><Cake size={24} className="text-rose-200" /></div>
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-neutral-900 truncate">{product.name}</p>
                                        {product.description && (
                                            <p className="text-xs text-neutral-400 truncate mt-0.5">{product.description}</p>
                                        )}
                                        <p className="text-sm font-black text-rose-600 mt-1">{formatPrice(product.price)}</p>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(product.id)}
                                        disabled={deleting === product.id}
                                        className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors disabled:opacity-50 flex-shrink-0"
                                    >
                                        {deleting === product.id
                                            ? <Loader2 size={14} className="animate-spin text-red-400" />
                                            : <X size={14} className="text-red-400" />
                                        }
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT — SettingsPage
// ═══════════════════════════════════════════════════════════════════════════

function PatisserieSettingsPage({ profile, user }: { profile: any; user: any }) {
    const supabase = getSupabaseBrowserClient()
    const [saving, setSaving] = useState(false)
    const [savingGps, setSavingGps] = useState(false)
    const [gpsStatus, setGpsStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')
    const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(
        profile?.latitude && profile?.longitude ? { lat: profile.latitude, lng: profile.longitude } : null
    )

    const [coverPreview, setCoverPreview] = useState<string | null>(profile?.cover_image || null)
    const [coverFile, setCoverFile] = useState<File | null>(null)

    const [form, setForm] = useState({
        store_name:          profile?.shop_name || profile?.store_name || '',
        shop_description:    profile?.shop_description || '',
        phone:               profile?.phone || '',
        city:                profile?.city || 'brazzaville',
        opening_hours_text:  profile?.opening_hours_text || '',
        is_open:             profile?.is_open !== false,
        delivery_time:       profile?.delivery_time || '30-60 min',
        min_order:           String(profile?.min_order || 0),
        delivery_fee:        String(profile?.delivery_fee || 0),
    })

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }))

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setCoverFile(file)
        setCoverPreview(URL.createObjectURL(file))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            let cover_image = coverPreview
            if (coverFile) {
                const ext = coverFile.name.split('.').pop()
                const path = `patisserie-covers/${user.id}-${Date.now()}.${ext}`
                const { error: upErr } = await supabase.storage.from('avatars').upload(path, coverFile, { upsert: true })
                if (!upErr) {
                    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
                    cover_image = urlData.publicUrl
                }
            }
            const result = await updateProfile({
                store_name:         form.store_name,
                shop_description:   form.shop_description,
                phone:              form.phone,
                city:               form.city,
                cover_image:        cover_image || null,
                opening_hours_text: form.opening_hours_text || null,
                is_open:            form.is_open,
                delivery_time:      form.delivery_time,
                min_order:          Number(form.min_order) || 0,
                delivery_fee:       Number(form.delivery_fee) || 0,
            })
            if (!result.success) toast.error((result as any).error)
            else toast.success('Paramètres enregistrés !')
        } catch (err: any) {
            toast.error(err.message || 'Erreur')
        } finally { setSaving(false) }
    }

    const handleRequestGps = () => {
        if (!navigator.geolocation) { toast.error('GPS non disponible'); return }
        setGpsStatus('requesting')
        navigator.geolocation.getCurrentPosition(
            pos => { setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsStatus('granted') },
            () => { setGpsStatus('denied'); toast.error('Position refusée') },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    const handleSaveGps = async () => {
        if (!gpsCoords) return
        setSavingGps(true)
        const result = await updateProfile({ latitude: gpsCoords.lat, longitude: gpsCoords.lng })
        setSavingGps(false)
        if (!result.success) toast.error((result as any).error)
        else { toast.success('Position GPS enregistrée !'); setGpsStatus('idle') }
    }

    return (
        <div className="space-y-4 pb-4">

            {/* ── Cover image ── */}
            <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-5">
                <h3 className="font-black text-sm mb-4">Image de couverture</h3>
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-rose-700 to-pink-700" style={{ height: 140 }}>
                    {coverPreview && <Image src={coverPreview} alt="Couverture" fill className="object-cover" sizes="600px" />}
                    {coverPreview && (
                        <button onClick={() => { setCoverFile(null); setCoverPreview(null) }}
                            className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                        ><X size={14} /></button>
                    )}
                    <label className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-black/20 transition-all">
                        <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl flex items-center gap-2 text-white text-xs font-black uppercase">
                            <Camera size={14} /> {coverPreview ? 'Changer' : 'Ajouter une photo'}
                        </div>
                        <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                    </label>
                </div>
            </div>

            {/* ── Infos boutique ── */}
            <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-5 space-y-4">
                <h3 className="font-black text-sm">Informations boutique</h3>
                <div>
                    <label className="text-[10px] font-black uppercase text-neutral-400 mb-1.5 block">Nom de la boutique</label>
                    <input value={form.store_name} onChange={set('store_name')}
                        placeholder="Ex: Délices de Brazza"
                        className="w-full p-3.5 rounded-2xl bg-neutral-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-300 transition"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-neutral-400 mb-1.5 block">Slogan (75 car. max)</label>
                    <input value={form.shop_description} onChange={set('shop_description')} maxLength={75}
                        placeholder="Pâtisseries artisanales sur commande…"
                        className="w-full p-3.5 rounded-2xl bg-neutral-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-300 transition"
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-black uppercase text-neutral-400 mb-1.5 block">Téléphone</label>
                        <input value={form.phone} onChange={set('phone')} placeholder="242064440000"
                            className="w-full p-3.5 rounded-2xl bg-neutral-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-300 transition"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-neutral-400 mb-1.5 block">Ville</label>
                        <select value={form.city} onChange={set('city')}
                            className="w-full p-3.5 rounded-2xl bg-neutral-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-300 transition appearance-none"
                        >
                            <option value="brazzaville">Brazzaville</option>
                            <option value="pointe-noire">Pointe-Noire</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ── Horaires ── */}
            <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-5 space-y-4">
                <h3 className="font-black text-sm">Statut &amp; Horaires</h3>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50">
                    <div>
                        <p className="text-sm font-black">{form.is_open ? '🟢 Ouverte' : '🔴 Fermée'}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">Visible par les clients en temps réel</p>
                    </div>
                    <button onClick={() => setForm(f => ({ ...f, is_open: !f.is_open }))}
                        className={`relative w-14 h-7 rounded-full transition-all duration-300 ${form.is_open ? 'bg-green-500' : 'bg-neutral-300'}`}
                    >
                        <div className={`absolute w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 top-0.5 ${form.is_open ? 'left-[30px]' : 'left-0.5'}`} />
                    </button>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-neutral-400 mb-1.5 block">Horaires (affiché aux clients)</label>
                    <input value={form.opening_hours_text} onChange={set('opening_hours_text')}
                        placeholder="Ex: Lun-Sam 8h00–19h00"
                        className="w-full p-3.5 rounded-2xl bg-neutral-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-300 transition"
                    />
                </div>
            </div>

            {/* ── Livraison ── */}
            <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-5 space-y-4">
                <h3 className="font-black text-sm">Livraison</h3>
                <div>
                    <label className="text-[10px] font-black uppercase text-neutral-400 mb-1.5 block">Délai de livraison</label>
                    <input value={form.delivery_time} onChange={set('delivery_time')}
                        placeholder="Ex: 30-60 min"
                        className="w-full p-3.5 rounded-2xl bg-neutral-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-300 transition"
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-black uppercase text-neutral-400 mb-1.5 block">Frais (FCFA)</label>
                        <input type="number" value={form.delivery_fee} onChange={set('delivery_fee')} min={0}
                            className="w-full p-3.5 rounded-2xl bg-neutral-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-300 transition"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-neutral-400 mb-1.5 block">Commande min. (FCFA)</label>
                        <input type="number" value={form.min_order} onChange={set('min_order')} min={0}
                            className="w-full p-3.5 rounded-2xl bg-neutral-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-300 transition"
                        />
                    </div>
                </div>
            </div>

            {/* ── GPS ── */}
            <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-5 space-y-4">
                <div>
                    <h3 className="font-black text-sm">Position GPS de la boutique</h3>
                    <p className="text-[10px] text-neutral-400 mt-1">Utilisée pour calculer les frais de livraison automatiquement</p>
                </div>
                {gpsCoords && gpsStatus !== 'granted' && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-2xl">
                        <Navigation size={15} className="text-green-500" />
                        <div>
                            <p className="text-xs font-black text-green-700">Position enregistrée</p>
                            <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}</p>
                        </div>
                    </div>
                )}
                {gpsStatus === 'granted' && gpsCoords && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-2xl">
                        <Navigation size={15} className="text-blue-500" />
                        <div className="flex-1">
                            <p className="text-xs font-black text-blue-700">Nouvelle position détectée</p>
                            <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}</p>
                        </div>
                        <button onClick={handleSaveGps} disabled={savingGps}
                            className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 disabled:opacity-50"
                        >
                            {savingGps ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                            Sauvegarder
                        </button>
                    </div>
                )}
                <button onClick={handleRequestGps} disabled={gpsStatus === 'requesting'}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-2xl border-2 border-dashed border-neutral-200 text-neutral-500 text-xs font-black uppercase hover:border-rose-300 hover:text-rose-500 transition-all disabled:opacity-50"
                >
                    {gpsStatus === 'requesting'
                        ? <><Loader2 size={13} className="animate-spin" />Localisation…</>
                        : <><Navigation size={13} />{gpsCoords ? 'Mettre à jour ma position' : 'Définir ma position GPS'}</>
                    }
                </button>
                {gpsStatus === 'denied' && (
                    <p className="text-[10px] text-red-500 font-bold text-center">Accès refusé — autorisez la géolocalisation dans votre navigateur.</p>
                )}
            </div>

            {/* ── Bouton enregistrer ── */}
            <button onClick={handleSave} disabled={saving}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-200 disabled:opacity-50"
            >
                {saving ? <><Loader2 size={16} className="animate-spin" />Enregistrement…</> : <><Check size={16} />Enregistrer</>}
            </button>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export default function PatisserieDashboardClient({ profile, user, products, productCount }: Props) {
    const [activePage, setActivePage] = useState<Page>('home')
    const [orders, setOrders] = useState<any[]>([])
    const [ordersLoaded, setOrdersLoaded] = useState(false)
    const [toggling, setToggling] = useState(false)
    const [localProfile, setLocalProfile] = useState(profile)
    const supabase = getSupabaseBrowserClient()

    const shopName = localProfile?.shop_name || localProfile?.store_name || 'Ma pâtisserie'

    useEffect(() => {
        getVendorOrders().then(({ orders: o }) => { setOrders(o || []); setOrdersLoaded(true) })
    }, [])

    const handleToggleOpen = useCallback(async () => {
        if (toggling) return
        setToggling(true)
        const newVal = !(localProfile?.is_open !== false)
        const result = await updateProfile({ is_open: newVal })
        if (!result.success) {
            toast.error((result as any).error)
        } else {
            setLocalProfile((p: any) => ({ ...p, is_open: newVal }))
            toast.success(newVal ? '🟢 Boutique ouverte !' : '🔴 Boutique fermée')
        }
        setToggling(false)
    }, [localProfile, toggling])

    const pageTitle: Record<Page, string> = {
        home: shopName, menu: 'Mon Menu', orders: 'Commandes',
        reviews: 'Avis clients', settings: 'Paramètres',
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">

            {/* ── Sidebar desktop ── */}
            <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-neutral-100 shadow-sm flex-shrink-0 min-h-screen">
                <div className="p-5 border-b border-neutral-100">
                    <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-2xl overflow-hidden bg-rose-100 flex-shrink-0">
                            {localProfile?.avatar_url
                                ? <Image src={localProfile.avatar_url} alt={shopName} fill className="object-cover" sizes="40px" />
                                : <Cake size={20} className="text-rose-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            }
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-black text-sm text-neutral-900 truncate">{shopName}</p>
                            <p className="text-[10px] text-neutral-400 font-medium">Pâtisserie</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-3 space-y-1">
                    {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => setActivePage(id)}
                            className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all
                                ${activePage === id
                                    ? 'bg-rose-50 text-rose-600'
                                    : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800'
                                }`}
                        >
                            <Icon size={18} />
                            {label}
                            {id === 'orders' && orders.filter(o => o.status === 'paid').length > 0 && (
                                <span className="ml-auto w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                                    {orders.filter(o => o.status === 'paid').length}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-neutral-100">
                    <Link href={`/patisserie/${localProfile?.id}`} target="_blank"
                        className="flex items-center gap-2 text-xs text-neutral-400 hover:text-rose-500 transition-colors font-bold"
                    >
                        <Eye size={14} /> Voir ma boutique
                        <ArrowUpRight size={12} className="ml-auto" />
                    </Link>
                </div>
            </aside>

            {/* ── Contenu principal ── */}
            <div className="flex-1 flex flex-col min-h-screen">

                {/* Header mobile + desktop */}
                <header className="bg-white border-b border-neutral-100 shadow-sm px-5 py-4 flex items-center justify-between sticky top-0 z-20">
                    <h1 className="font-black text-base text-neutral-900 truncate">{pageTitle[activePage]}</h1>
                    <div className="flex items-center gap-2">
                        {/* Badge open/closed */}
                        <span className={`hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${localProfile?.is_open !== false ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${localProfile?.is_open !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                            {localProfile?.is_open !== false ? 'Ouvert' : 'Fermé'}
                        </span>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-4 sm:p-6 max-w-2xl w-full mx-auto">
                    {activePage === 'home' && (
                        <HomePage
                            profile={localProfile}
                            products={products}
                            orders={orders}
                            onToggleOpen={handleToggleOpen}
                            toggling={toggling}
                        />
                    )}
                    {activePage === 'menu' && (
                        <MenuPage products={products} sellerId={user.id} />
                    )}
                    {activePage === 'orders' && (
                        ordersLoaded
                            ? <OrdersPage orders={orders} />
                            : <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-rose-400" /></div>
                    )}
                    {activePage === 'reviews' && (
                        <ReviewsPage sellerId={user.id} />
                    )}
                    {activePage === 'settings' && (
                        <PatisserieSettingsPage profile={localProfile} user={user} />
                    )}
                </main>
            </div>

            {/* ── Bottom nav mobile ── */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-neutral-100 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] flex">
                {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setActivePage(id)}
                        className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors relative
                            ${activePage === id ? 'text-rose-500' : 'text-neutral-400'}`}
                    >
                        <Icon size={20} />
                        <span className="text-[9px] font-bold">{label}</span>
                        {id === 'orders' && orders.filter(o => o.status === 'paid').length > 0 && (
                            <span className="absolute top-2 right-[calc(50%-14px)] w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                                {orders.filter(o => o.status === 'paid').length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

        </div>
    )
}
