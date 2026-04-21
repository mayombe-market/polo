'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { adminGetHotelVendors } from '@/app/actions/admin'
import { Loader2, Star, Mail, Phone, MapPin, RefreshCw, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { formatAdminDateTime } from '@/lib/formatDateTime'

const PLAN_CONFIG: Record<string, { label: string; color: string }> = {
    hotel_free:  { label: '🏠 Chambre/Auberge', color: '#94A3B8' },
    hotel_pro:   { label: '🏨 Hôtel de Quartier', color: '#F59E0B' },
    hotel_chain: { label: '⭐ Grand Hôtel', color: '#8B5CF6' },
}

export default function AdminHotelsPage() {
    const [hotels, setHotels] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [filter, setFilter] = useState<'all' | 'hotel_free' | 'hotel_pro' | 'hotel_chain'>('all')
    const [search, setSearch] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        const res = await adminGetHotelVendors()
        setHotels(res.data || [])
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    const filtered = hotels.filter(h => {
        if (filter !== 'all' && h.subscription_plan !== filter) return false
        if (search) {
            const q = search.toLowerCase()
            return (h.shop_name || '').toLowerCase().includes(q) ||
                   (h.email || '').toLowerCase().includes(q) ||
                   (h.city || '').toLowerCase().includes(q)
        }
        return true
    })

    const stats = {
        total: hotels.length,
        free: hotels.filter(h => h.subscription_plan === 'hotel_free').length,
        pro: hotels.filter(h => h.subscription_plan === 'hotel_pro').length,
        chain: hotels.filter(h => h.subscription_plan === 'hotel_chain').length,
        totalReviews: hotels.reduce((s, h) => s + h.reviewCount, 0),
        pendingReqs: hotels.reduce((s, h) => s + h.reviewRequests.pending, 0),
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 py-6 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                                <span className="text-lg">🏨</span>
                            </div>
                            <div>
                                <h1 className="text-lg font-black uppercase italic tracking-tight dark:text-white">Hôtels</h1>
                                <p className="text-[10px] text-slate-400">{stats.total} établissements · {stats.totalReviews} avis reçus</p>
                            </div>
                        </div>
                        <button onClick={load} disabled={loading} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                            <RefreshCw size={14} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                        {[
                            { label: 'Total hôtels', val: stats.total, color: '#F59E0B' },
                            { label: 'Chambre/Auberge', val: stats.free, color: '#94A3B8' },
                            { label: 'Hôtel de Quartier', val: stats.pro, color: '#F59E0B' },
                            { label: 'Grand Hôtel', val: stats.chain, color: '#8B5CF6' },
                            { label: 'Demandes d\'avis', val: stats.pendingReqs, color: '#EF4444' },
                        ].map((s, i) => (
                            <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-3 text-center">
                                <p className="text-xl font-black" style={{ color: s.color }}>{s.val}</p>
                                <p className="text-[9px] font-bold uppercase text-slate-400 mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Filtres + Search */}
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher un hôtel..."
                            className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:text-white"
                        />
                        <div className="flex gap-1.5">
                            {(['all', 'hotel_free', 'hotel_pro', 'hotel_chain'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                        filter === f
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {f === 'all' ? 'Tous' : PLAN_CONFIG[f]?.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Liste */}
            <div className="max-w-6xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-amber-500" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                        <p className="text-sm font-bold text-slate-400">Aucun hôtel trouvé</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map(hotel => {
                            const plan = PLAN_CONFIG[hotel.subscription_plan] || PLAN_CONFIG.hotel_free
                            const isExpanded = expandedId === hotel.id
                            return (
                                <div key={hotel.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                    <div
                                        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                        onClick={() => setExpandedId(isExpanded ? null : hotel.id)}
                                    >
                                        {/* Avatar */}
                                        <div className="w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                                            {hotel.avatar_url
                                                ? <img src={hotel.avatar_url} alt="" className="w-full h-full object-cover" />
                                                : <span className="text-xl">🏨</span>
                                            }
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {hotel.shop_name || hotel.full_name || hotel.email}
                                                </p>
                                                <span
                                                    className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                                                    style={{ background: plan.color + '18', color: plan.color }}
                                                >
                                                    {plan.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                                {hotel.city && (
                                                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                                        <MapPin size={9} /> {hotel.city}
                                                    </span>
                                                )}
                                                <span className="text-[11px] text-slate-400">
                                                    Inscrit {formatAdminDateTime(hotel.created_at)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Stats rapides */}
                                        <div className="flex items-center gap-4 flex-shrink-0 text-right">
                                            <div>
                                                <p className="text-sm font-black text-amber-500">{hotel.reviewCount}</p>
                                                <p className="text-[9px] text-slate-400">avis</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-black" style={{ color: hotel.reviewRequests.pending > 0 ? '#EF4444' : '#94A3B8' }}>
                                                    {hotel.reviewRequests.pending}
                                                </p>
                                                <p className="text-[9px] text-slate-400">en attente</p>
                                            </div>
                                            {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                        </div>
                                    </div>

                                    {/* Détails expandus */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-black uppercase text-slate-400">Contact</p>
                                                    {hotel.email && (
                                                        <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                                            <Mail size={11} className="text-slate-400" /> {hotel.email}
                                                        </p>
                                                    )}
                                                    {hotel.phone && (
                                                        <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                                            <Phone size={11} className="text-slate-400" /> {hotel.phone}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-black uppercase text-slate-400">Avis clients</p>
                                                    <div className="flex gap-4">
                                                        <div>
                                                            <p className="text-lg font-black text-green-500">{hotel.reviewRequests.completed}</p>
                                                            <p className="text-[9px] text-slate-400">reçus</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-lg font-black text-amber-500">{hotel.reviewRequests.pending}</p>
                                                            <p className="text-[9px] text-slate-400">en attente</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-black uppercase text-slate-400">Actions</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Link
                                                            href={`/store/${hotel.id}`}
                                                            target="_blank"
                                                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all no-underline"
                                                        >
                                                            <ExternalLink size={11} /> Voir boutique
                                                        </Link>
                                                        <Link
                                                            href={`/admin/subscriptions?vendor=${hotel.id}`}
                                                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-xs font-bold text-amber-600 hover:bg-amber-100 transition-all no-underline"
                                                        >
                                                            Gérer plan
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
