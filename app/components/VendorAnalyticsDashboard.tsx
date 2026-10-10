'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    BarChart3, Eye, ShoppingCart, TrendingUp, Users, Heart, Star,
    Calendar, Globe, Search, Loader2, AlertCircle, Package,
} from 'lucide-react'
import { getVendorAnalytics, VendorAnalyticsResult } from '@/app/actions/analytics'
import { SOURCE_LABELS, SOURCE_COLORS, TrafficSource } from '@/lib/analytics'
import ShareLinksPanel from '@/app/components/ShareLinksPanel'
import Image from 'next/image'

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))
const fmtPct = (s: string | number) => `${s}%`

type Period = 'today' | '7d' | '30d' | '90d' | 'custom'

function periodToRange(period: Period, customFrom?: string, customTo?: string): { from: string; to: string } {
    const now = new Date()
    const to = now.toISOString()
    if (period === 'today') {
        const from = new Date(now)
        from.setHours(0, 0, 0, 0)
        return { from: from.toISOString(), to }
    }
    if (period === '7d') return { from: new Date(Date.now() - 7 * 86400_000).toISOString(), to }
    if (period === '30d') return { from: new Date(Date.now() - 30 * 86400_000).toISOString(), to }
    if (period === '90d') return { from: new Date(Date.now() - 90 * 86400_000).toISOString(), to }
    // custom
    return {
        from: customFrom ? new Date(customFrom).toISOString() : new Date(Date.now() - 30 * 86400_000).toISOString(),
        to: customTo ? new Date(`${customTo}T23:59:59`).toISOString() : to,
    }
}

const PERIOD_LABELS: Record<Period, string> = {
    today: "Aujourd'hui",
    '7d': '7 derniers jours',
    '30d': '30 derniers jours',
    '90d': '90 derniers jours',
    custom: 'Période personnalisée',
}

interface Props {
    sellerId: string
    shopSlug?: string
    shopName?: string
    /** Commandes déjà chargées dans le dashboard (fallback pour le graphique mensuel) */
    orders?: any[]
    /** Produits chargés (fallback top products) */
    products?: any[]
    followerCount?: number
}

export default function VendorAnalyticsDashboard({
    sellerId, shopSlug, shopName, orders = [], products = [], followerCount = 0
}: Props) {
    const [period, setPeriod] = useState<Period>('30d')
    const [customFrom, setCustomFrom] = useState('')
    const [customTo, setCustomTo] = useState('')
    const [activeTab, setActiveTab] = useState<'overview' | 'audience' | 'products' | 'share'>('overview')

    const [data, setData] = useState<VendorAnalyticsResult | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const range = periodToRange(period, customFrom || undefined, customTo || undefined)
            const result = await getVendorAnalytics({ shop_id: sellerId, ...range })
            setData(result)
        } catch (e: any) {
            setError(e?.message || 'Erreur de chargement')
        } finally {
            setLoading(false)
        }
    }, [sellerId, period, customFrom, customTo])

    useEffect(() => { void load() }, [load])

    // Fallback : si la table analytics est vide, utiliser products.views_count
    const totalViewsFallback = products.reduce((acc: number, p: any) => acc + (p.views_count || 0), 0)
    const displayViews = (data?.shopViews ?? 0) > 0 ? data!.shopViews : null
    const displayProductViews = (data?.productViews ?? 0) > 0 ? data!.productViews : totalViewsFallback

    const topProducts = data?.topProducts?.length ? data.topProducts : [...products]
        .sort((a: any, b: any) => (b.views_count || 0) - (a.views_count || 0))
        .slice(0, 5)
        .map((p: any) => ({
            id: p.id, name: p.name,
            img: p.img || p.image_url || null,
            views_count: p.views_count || 0,
            confirmed_sales_count: p.confirmed_sales_count || 0,
        }))

    const totalOrdersFallback = orders.length
    const confirmedFallback = orders.filter((o: any) => ['confirmed', 'shipped', 'delivered'].includes(o.status)).length

    return (
        <div className="p-4 md:p-6 space-y-5">
            {/* Header + filtre période */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black uppercase italic tracking-tighter dark:text-white">Statistiques</h2>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">Données réelles • aucun chiffre inventé</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {(['today', '7d', '30d', '90d', 'custom'] as Period[]).map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`text-[11px] font-black px-3 py-1.5 rounded-xl border transition-all ${period === p
                                ? 'bg-amber-500 text-white border-amber-500'
                                : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-amber-300'
                            }`}
                        >
                            {PERIOD_LABELS[p]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Sélecteur dates custom */}
            {period === 'custom' && (
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                            className="text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 dark:text-white" />
                    </div>
                    <span className="text-slate-400 text-xs font-bold">→</span>
                    <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                        className="text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 dark:text-white" />
                    <button onClick={load}
                        className="text-xs font-black px-4 py-2 bg-amber-500 text-white rounded-xl">
                        Appliquer
                    </button>
                </div>
            )}

            {/* Onglets */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 w-fit flex-wrap">
                {([
                    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
                    { id: 'audience', label: 'Audience', icon: Globe },
                    { id: 'products', label: 'Produits', icon: Package },
                    { id: 'share', label: 'Partager', icon: Search },
                ] as const).map(tab => {
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 text-[11px] font-black px-3 py-2 rounded-xl transition-all ${activeTab === tab.id
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                        >
                            <Icon size={12} />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {loading && (
                <div className="flex items-center gap-3 py-8 justify-center text-slate-400">
                    <Loader2 size={20} className="animate-spin" />
                    <span className="text-sm font-bold">Chargement des données…</span>
                </div>
            )}

            {error && !loading && (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800">
                    <AlertCircle size={18} className="text-red-500 shrink-0" />
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {!loading && !error && (
                <>
                    {/* ═══ VUE D'ENSEMBLE ═══ */}
                    {activeTab === 'overview' && (
                        <div className="space-y-5">
                            {/* Note données en cours de collecte */}
                            {(data?.shopViews ?? 0) === 0 && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800">
                                    <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                                        Les données de visite commencent à se collecter dès maintenant.
                                        Les vues produits historiques restent disponibles ci-dessous.
                                    </p>
                                </div>
                            )}

                            {/* KPI Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {[
                                    {
                                        label: 'Visites boutique',
                                        value: displayViews !== null ? fmt(displayViews) : '—',
                                        sub: data?.uniqueVisitors ? `~${fmt(data.uniqueVisitors)} uniques` : 'Données en cours',
                                        icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20',
                                    },
                                    {
                                        label: 'Vues produits',
                                        value: fmt(displayProductViews),
                                        sub: 'Total historique',
                                        icon: Package, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20',
                                    },
                                    {
                                        label: 'Commandes',
                                        value: fmt(data?.totalOrders ?? totalOrdersFallback),
                                        sub: `${fmt(data?.confirmedOrders ?? confirmedFallback)} confirmées`,
                                        icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20',
                                    },
                                    {
                                        label: 'CA confirmé',
                                        value: `${fmt(data?.revenue ?? 0)} F`,
                                        sub: `Conv. ${fmtPct(data?.conversionRate ?? '0.0')}`,
                                        icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20',
                                    },
                                    {
                                        label: 'Abonnés total',
                                        value: fmt(followerCount),
                                        sub: data?.newFollowers ? `+${data.newFollowers} nouveaux` : 'Sur la période',
                                        icon: Users, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20',
                                    },
                                    {
                                        label: 'Favoris ajoutés',
                                        value: fmt(data?.favoritesAdded ?? 0),
                                        sub: 'Sur la période',
                                        icon: Heart, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20',
                                    },
                                ].map((kpi, i) => {
                                    const Icon = kpi.icon
                                    return (
                                        <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                                            <div className={`w-9 h-9 ${kpi.bg} rounded-xl flex items-center justify-center mb-3`}>
                                                <Icon size={16} className={kpi.color} />
                                            </div>
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-tight">{kpi.label}</p>
                                            <p className={`text-xl font-black ${kpi.color} mt-1`}>{kpi.value}</p>
                                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">{kpi.sub}</p>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Graphique revenus mensuels */}
                            {(data?.revenueByMonth?.length ?? 0) > 0 && (
                                <RevenueChart months={data!.revenueByMonth} />
                            )}
                        </div>
                    )}

                    {/* ═══ AUDIENCE / SOURCES ═══ */}
                    {activeTab === 'audience' && (
                        <AudienceTab sourceBreakdown={data?.sourceBreakdown ?? []} />
                    )}

                    {/* ═══ PRODUITS ═══ */}
                    {activeTab === 'products' && (
                        <ProductsTab
                            topProducts={topProducts}
                            topSoldProducts={data?.topSoldProducts ?? []}
                        />
                    )}

                    {/* ═══ PARTAGER ═══ */}
                    {activeTab === 'share' && (
                        <ShareLinksPanel sellerId={sellerId} shopSlug={shopSlug} shopName={shopName} />
                    )}
                </>
            )}
        </div>
    )
}

// ─── Graphique revenus ────────────────────────────────────────────────────────

function RevenueChart({ months }: { months: Array<{ month: string; revenue: number }> }) {
    const max = Math.max(...months.map(m => m.revenue), 1)
    const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))
    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-5">
            <h3 className="font-black uppercase text-xs dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 size={14} className="text-amber-500" />
                Revenus mensuels confirmés
            </h3>
            <div className="flex items-end gap-2 h-36">
                {months.map((m, i) => {
                    const height = Math.max((m.revenue / max) * 100, 4)
                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[9px] font-black text-slate-500">
                                {m.revenue > 0 ? `${fmt(m.revenue)}F` : ''}
                            </span>
                            <div className="w-full relative" style={{ height: 100 }}>
                                <div
                                    className="w-full rounded-lg transition-all duration-700 absolute bottom-0"
                                    style={{
                                        height: `${height}%`,
                                        background: m.revenue > 0 ? 'linear-gradient(180deg,#F59E0B,#E8A838)' : '#e5e7eb',
                                    }}
                                />
                            </div>
                            <span className="text-[9px] font-bold text-slate-400">{m.month}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Onglet Audience ──────────────────────────────────────────────────────────

function AudienceTab({ sourceBreakdown }: { sourceBreakdown: VendorAnalyticsResult['sourceBreakdown'] }) {
    const total = sourceBreakdown.reduce((s, r) => s + (r.shop_views || 0), 0)

    if (total === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 text-center">
                <Globe size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-black text-slate-400 uppercase">Pas encore de données d'audience</p>
                <p className="text-xs text-slate-400 mt-1">
                    Les sources de trafic s'afficheront ici au fur et à mesure des visites via des liens UTM.
                </p>
                <p className="text-xs text-slate-500 mt-3 font-bold">
                    Conseil : utilisez l'onglet <span className="text-amber-600">Partager</span> pour créer des liens avec suivi de source.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-5">
                <h3 className="font-black uppercase text-xs dark:text-white mb-4 flex items-center gap-2">
                    <Globe size={14} className="text-purple-500" />
                    Visites par source
                </h3>
                <div className="space-y-3">
                    {sourceBreakdown.map((row, i) => {
                        const pct = total > 0 ? Math.round((row.shop_views / total) * 100) : 0
                        const color = SOURCE_COLORS[row.source as TrafficSource] ?? '#D1D5DB'
                        const label = SOURCE_LABELS[row.source as TrafficSource] ?? row.source
                        return (
                            <div key={i}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{label}</span>
                                    <div className="text-right">
                                        <span className="text-xs font-black text-slate-900 dark:text-white">{row.shop_views}</span>
                                        <span className="text-[10px] text-slate-400 font-bold ml-1">({pct}%)</span>
                                    </div>
                                </div>
                                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{ width: `${pct}%`, backgroundColor: color }}
                                    />
                                </div>
                                {row.product_views > 0 && (
                                    <p className="text-[10px] text-slate-400 mt-0.5">{row.product_views} vues produits</p>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

// ─── Onglet Produits ──────────────────────────────────────────────────────────

function ProductsTab({
    topProducts,
    topSoldProducts,
}: {
    topProducts: VendorAnalyticsResult['topProducts']
    topSoldProducts: VendorAnalyticsResult['topSoldProducts']
}) {
    const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

    return (
        <div className="space-y-5">
            {/* Top vues */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-5">
                <h3 className="font-black uppercase text-xs dark:text-white mb-4 flex items-center gap-2">
                    <Eye size={14} className="text-purple-500" />
                    Produits les plus consultés
                </h3>
                {topProducts.length > 0 ? (
                    <div className="space-y-2">
                        {topProducts.map((p, i) => (
                            <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                <span className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 font-black text-xs shrink-0">
                                    {i + 1}
                                </span>
                                {p.img && (
                                    <img src={p.img} alt={p.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black uppercase italic truncate dark:text-white">{p.name}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-black text-purple-600">{fmt(p.views_count)}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">vues</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-slate-400 italic text-center py-4">Aucun produit</p>
                )}
            </div>

            {/* Top vendus */}
            {topSoldProducts.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-5">
                    <h3 className="font-black uppercase text-xs dark:text-white mb-4 flex items-center gap-2">
                        <Star size={14} className="text-amber-500" />
                        Produits les plus vendus (période)
                    </h3>
                    <div className="space-y-2">
                        {topSoldProducts.map((p, i) => (
                            <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                <span className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 font-black text-xs shrink-0">
                                    {i + 1}
                                </span>
                                {p.img && (
                                    <img src={p.img} alt={p.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black uppercase italic truncate dark:text-white">{p.name}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-black text-amber-600">{fmt(p.quantity)}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">vendus</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
