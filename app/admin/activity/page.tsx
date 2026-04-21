'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { adminGetRecentActivity } from '@/app/actions/admin'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Loader2, RefreshCw, Zap, Filter } from 'lucide-react'
import { formatAdminDateTime } from '@/lib/formatDateTime'

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
    order:        { label: 'Commande',     icon: '🛒', color: '#F97316', bg: 'rgba(249,115,22,0.08)' },
    vendor:       { label: 'Vendeur',      icon: '🧑‍💼', color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
    product:      { label: 'Produit',      icon: '📦', color: '#6366F1', bg: 'rgba(99,102,241,0.08)' },
    review:       { label: 'Avis',         icon: '⭐', color: '#EAB308', bg: 'rgba(234,179,8,0.08)' },
    verification: { label: 'Vérification', icon: '🛡️', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
    hotel_review: { label: 'Hôtel',        icon: '🏨', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
}

const FILTERS = [
    { id: 'all',          label: '🌐 Tout' },
    { id: 'order',        label: '🛒 Commandes' },
    { id: 'vendor',       label: '🧑‍💼 Vendeurs' },
    { id: 'product',      label: '📦 Produits' },
    { id: 'review',       label: '⭐ Avis' },
    { id: 'verification', label: '🛡️ Vérifs' },
    { id: 'hotel_review', label: '🏨 Hôtels' },
]

type Item = {
    id: string; type: string; title: string; subtitle: string
    created_at: string; link?: string; badge?: string; badgeColor?: string
}

export default function AdminActivityPage() {
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [newCount, setNewCount] = useState(0)
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
    const supabase = getSupabaseBrowserClient()
    const itemsRef = useRef<Item[]>([])

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)
        const res = await adminGetRecentActivity(100)
        if (res.data) {
            itemsRef.current = res.data
            setItems(res.data)
            setNewCount(0)
            setLastRefresh(new Date())
        }
        if (!silent) setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    // Realtime — prepend new events without full reload
    useEffect(() => {
        const channels = [
            supabase.channel('admin-activity-orders')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => setNewCount(n => n + 1)),
            supabase.channel('admin-activity-profiles')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => setNewCount(n => n + 1)),
            supabase.channel('admin-activity-products')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'products' }, () => setNewCount(n => n + 1)),
            supabase.channel('admin-activity-reviews')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, () => setNewCount(n => n + 1)),
            supabase.channel('admin-activity-verifs')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vendor_verifications' }, () => setNewCount(n => n + 1)),
        ]
        channels.forEach(c => c.subscribe())
        return () => { channels.forEach(c => supabase.removeChannel(c)) }
    }, [supabase])

    const visible = filter === 'all' ? items : items.filter(i => i.type === filter)

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 py-6 px-4 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center">
                            <Zap size={18} className="text-orange-500" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black uppercase italic tracking-tight dark:text-white">
                                Fil d&apos;activité
                            </h1>
                            <p className="text-[10px] text-slate-400">
                                Mis à jour {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                {' '}· {visible.length} événements
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {newCount > 0 && (
                            <button
                                onClick={() => load()}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500 text-white text-xs font-bold animate-pulse"
                            >
                                <span className="w-2 h-2 rounded-full bg-white" />
                                {newCount} nouveau{newCount > 1 ? 'x' : ''} — Actualiser
                            </button>
                        )}
                        <button
                            onClick={() => load()}
                            disabled={loading}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            <RefreshCw size={14} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Filtres */}
                <div className="max-w-5xl mx-auto mt-3 flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {FILTERS.map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                filter === f.id
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            {f.label}
                            {f.id !== 'all' && (
                                <span className="ml-1.5 opacity-60">
                                    {items.filter(i => i.type === f.id).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-orange-500" />
                    </div>
                ) : visible.length === 0 ? (
                    <div className="text-center py-20">
                        <Filter size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                        <p className="text-sm font-bold text-slate-400">Aucun événement dans cette catégorie</p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Ligne verticale */}
                        <div className="absolute left-[22px] top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />

                        <div className="space-y-2">
                            {visible.map((item, i) => {
                                const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.order
                                const isFirst = i === 0
                                return (
                                    <div key={item.id} className={`flex gap-4 items-start group ${isFirst ? 'animate-fade-in' : ''}`}>
                                        {/* Icône sur la timeline */}
                                        <div
                                            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 relative z-10 border-2 border-white dark:border-slate-950"
                                            style={{ background: cfg.bg, borderColor: cfg.color + '22' }}
                                        >
                                            <span className="text-lg leading-none">{cfg.icon}</span>
                                        </div>

                                        {/* Contenu */}
                                        <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-4 py-3 group-hover:border-slate-200 dark:group-hover:border-slate-700 transition-colors">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                        {item.title}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                                        {item.subtitle}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                    {item.badge && (
                                                        <span
                                                            className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                                                            style={{ background: (item.badgeColor || '#888') + '18', color: item.badgeColor || '#888' }}
                                                        >
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-slate-300 dark:text-slate-600 whitespace-nowrap">
                                                        {formatAdminDateTime(item.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
