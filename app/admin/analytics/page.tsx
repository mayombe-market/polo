'use client'

import { useState, useEffect, useCallback } from 'react'
import { adminGetPlatformAnalytics, type PlatformAnalytics } from '@/app/actions/admin'
import { adminGetBehaviorAnalytics, type BehaviorAnalytics } from '@/app/actions/behaviorAnalytics'
import { SOURCE_LABELS, SOURCE_COLORS, type TrafficSource } from '@/lib/analytics'
import { Loader2, Users, Eye, ShoppingCart, TrendingUp, MapPin, Globe, RefreshCw, Package, UserPlus, AlertTriangle, Store, CheckCheck, Smartphone, Monitor, MousePointerClick, MessageCircle } from 'lucide-react'

type Period = '1d' | '7d' | '30d' | 'all'

const PERIOD_LABELS: Record<Period, string> = {
    '1d': "Aujourd'hui",
    '7d': '7 jours',
    '30d': '30 jours',
    'all': 'Tout',
}

const PM_LABELS: Record<string, string> = {
    mobile_money: 'MTN MoMo',
    airtel_money: 'Airtel Money',
    cod: 'Cash livraison',
    cash: 'Cash livraison',
}

const USER_TYPE_LABELS: Record<string, string> = {
    connected: 'Connectés',
    guest: 'Invités',
    anonymous: 'Anonymes',
}

function BehaviorFunnel({ data }: { data: BehaviorAnalytics }) {
    const steps = [
        { label: 'Ajout panier', count: data.funnelCounts.add_to_cart, color: '#8B5CF6' },
        { label: 'Checkout ouvert', count: data.funnelCounts.checkout_started, color: '#F97316' },
        { label: 'Déclaration paiement', count: data.funnelCounts.payment_declaration_submitted, color: '#EAB308' },
        { label: 'Commande créée', count: data.funnelCounts.order_created, color: '#22C55E' },
    ]
    const hasAny = steps.some(s => s.count > 0)
    if (!hasAny) return <p className="text-center text-slate-400 text-sm py-4">Aucune donnée — migration <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">behavior_events</code> requise</p>
    return (
        <div className="flex gap-3">
            {steps.map((s, i) => {
                const prev = i > 0 ? steps[i - 1].count : null
                const pct = prev && prev > 0 ? Math.round((s.count / prev) * 100) : null
                return (
                    <div key={s.label} className="flex-1 min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 text-center">
                        <p className="text-2xl font-black italic tracking-tighter" style={{ color: s.color }}>{s.count.toLocaleString('fr-FR')}</p>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1 leading-tight">{s.label}</p>
                        {pct !== null && <p className="text-[9px] font-bold mt-2 text-slate-400">{pct}% du précédent</p>}
                    </div>
                )
            })}
        </div>
    )
}

function pct(part: number, total: number) {
    if (!total) return 0
    return Math.round((part / total) * 100)
}

function FunnelStep({ label, count, prev, color }: { label: string; count: number; prev?: number; color: string }) {
    const drop = prev !== undefined && prev > 0 ? pct(count, prev) : null
    return (
        <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 text-center">
            <p className="text-2xl font-black italic tracking-tighter" style={{ color }}>{count.toLocaleString('fr-FR')}</p>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">{label}</p>
            {drop !== null && (
                <p className="text-[9px] font-bold mt-2 text-slate-400">
                    {drop}% du précédent
                </p>
            )}
        </div>
    )
}

function SourceBar({ source, visitors, maxVisitors, shop_views, product_views, checkout_starts }: {
    source: string; visitors: number; maxVisitors: number; shop_views: number; product_views: number; checkout_starts: number
}) {
    const label = SOURCE_LABELS[source as TrafficSource] ?? source
    const color = SOURCE_COLORS[source as TrafficSource] ?? '#94A3B8'
    const w = maxVisitors > 0 ? (visitors / maxVisitors) * 100 : 0

    return (
        <div className="py-2.5">
            <div className="flex items-center justify-between mb-1.5 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-xs font-bold dark:text-white truncate">{label}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-shrink-0">
                    <span><span className="font-black dark:text-white">{visitors}</span> visiteurs</span>
                    {checkout_starts > 0 && <span className="text-orange-500 font-black">{checkout_starts} achats</span>}
                </div>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${w}%`, background: color }} />
            </div>
            <div className="flex gap-4 mt-1">
                <span className="text-[9px] text-slate-400">{shop_views} vues boutique</span>
                <span className="text-[9px] text-slate-400">{product_views} vues produits</span>
            </div>
        </div>
    )
}

function TrendChart({ data }: { data: Array<{ date: string; visitors: number; orders: number }> }) {
    if (!data.length) return <p className="text-center text-slate-400 text-sm py-4">Pas de données</p>
    const maxV = Math.max(...data.map(d => d.visitors), 1)
    return (
        <div className="flex items-end gap-1 h-20 pt-2">
            {data.map(d => {
                const h = Math.max(4, (d.visitors / maxV) * 72)
                const dateStr = new Date(d.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
                return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[9px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            {d.visitors} vis. · {d.orders} cmd
                        </div>
                        <div
                            className="w-full rounded-t-sm bg-orange-400 dark:bg-orange-500 transition-all duration-500 hover:bg-orange-500 dark:hover:bg-orange-400"
                            style={{ height: `${h}px` }}
                        />
                        <span className="text-[8px] text-slate-400 rotate-45 origin-left translate-y-1 whitespace-nowrap">{dateStr}</span>
                    </div>
                )
            })}
        </div>
    )
}

export default function AdminAnalyticsPage() {
    const [period, setPeriod] = useState<Period>('7d')
    const [data, setData] = useState<PlatformAnalytics | null>(null)
    const [behavior, setBehavior] = useState<BehaviorAnalytics | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    const load = useCallback(async (p: Period) => {
        setLoading(true)
        setError(false)
        let from: string | null = null
        if (p === '1d') from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        else if (p === '7d') from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        else if (p === '30d') from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

        const [res, beh] = await Promise.all([
            adminGetPlatformAnalytics(p),
            adminGetBehaviorAnalytics(from),
        ])
        if ('error' in res) {
            setError(true)
        } else {
            setData(res)
        }
        setBehavior(beh)
        setLoading(false)
    }, [])

    useEffect(() => { load(period) }, [period, load])

    const kpis = data ? [
        { label: 'Visiteurs uniques', value: data.uniqueVisitors.toLocaleString('fr-FR'), icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        { label: 'Vues boutiques', value: data.shopViews.toLocaleString('fr-FR'), icon: Eye, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        { label: 'Vues produits', value: data.productViews.toLocaleString('fr-FR'), icon: Package, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
        { label: 'Clics "Acheter"', value: data.checkoutStarts.toLocaleString('fr-FR'), icon: ShoppingCart, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
        { label: 'Commandes passées', value: data.ordersTotal.toLocaleString('fr-FR'), icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
        { label: 'Nouveaux inscrits', value: data.newUsers.toLocaleString('fr-FR'), icon: UserPlus, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
    ] : []

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 py-8 px-4">
                <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black uppercase italic tracking-tighter">
                            Ana<span className="text-orange-500">lytiques</span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                            Trafic · Sources · Conversions — Plateforme complète
                        </p>
                    </div>
                    {!loading && (
                        <button
                            onClick={() => load(period)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            <RefreshCw size={13} /> Actualiser
                        </button>
                    )}
                </div>
            </div>

            {/* Period tabs */}
            <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 px-4">
                <div className="max-w-7xl mx-auto flex gap-1 py-2">
                    {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setPeriod(key)}
                            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                period === key
                                    ? 'bg-orange-500 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 size={32} className="animate-spin text-orange-500" />
                    </div>
                ) : error ? (
                    <div className="text-center py-16 text-red-500 font-bold">
                        Erreur de chargement.{' '}
                        <button onClick={() => load(period)} className="underline">Réessayer</button>
                    </div>
                ) : data ? (
                    <>
                        {/* KPIs */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {kpis.map(k => (
                                <div key={k.label} className={`${k.bg} p-4 rounded-2xl border border-slate-100 dark:border-slate-800`}>
                                    <k.icon size={16} className={`${k.color} mb-2`} />
                                    <p className={`text-2xl font-black italic tracking-tighter ${k.color}`}>{k.value}</p>
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1 leading-tight">{k.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Taux de conversion */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                            <div className="flex flex-wrap items-center gap-6">
                                <div>
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Taux de conversion</p>
                                    <p className="text-3xl font-black italic text-orange-500">{data.conversionRate}%</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">visiteurs → commandes</p>
                                </div>
                                <div className="h-10 w-px bg-slate-100 dark:bg-slate-800 hidden sm:block" />
                                <div>
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Commandes confirmées</p>
                                    <p className="text-3xl font-black italic text-green-500">{data.ordersConfirmed.toLocaleString('fr-FR')}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{pct(data.ordersConfirmed, data.ordersTotal)}% des commandes passées</p>
                                </div>
                                <div className="h-10 w-px bg-slate-100 dark:bg-slate-800 hidden sm:block" />
                                <div>
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Clics → Commandes</p>
                                    <p className="text-3xl font-black italic text-indigo-500">{pct(data.ordersTotal, data.checkoutStarts)}%</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">clic acheter → commande passée</p>
                                </div>
                            </div>
                        </div>

                        {/* Funnel */}
                        <div>
                            <h2 className="text-xs font-black uppercase italic tracking-widest text-slate-400 mb-3">Entonnoir de conversion</h2>
                            <div className="flex gap-3">
                                <FunnelStep label="Visiteurs uniques" count={data.uniqueVisitors} color="#3B82F6" />
                                <FunnelStep label="Vues produits" count={data.productViews} prev={data.uniqueVisitors} color="#8B5CF6" />
                                <FunnelStep label='Clics "Acheter"' count={data.checkoutStarts} prev={data.productViews} color="#F97316" />
                                <FunnelStep label="Commandes" count={data.ordersTotal} prev={data.checkoutStarts} color="#22C55E" />
                                <FunnelStep label="Confirmées" count={data.ordersConfirmed} prev={data.ordersTotal} color="#16A34A" />
                            </div>
                        </div>

                        {/* Sources + Tendance */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* Sources de trafic */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                                    <Globe size={15} className="text-orange-500" />
                                    <h2 className="text-sm font-black uppercase italic tracking-wider dark:text-white">Sources de trafic</h2>
                                </div>
                                <div className="px-5 py-3 divide-y divide-slate-50 dark:divide-slate-800/60">
                                    {data.sourceBreakdown.length === 0 ? (
                                        <p className="text-center text-slate-400 text-sm py-6">Aucune donnée</p>
                                    ) : (
                                        data.sourceBreakdown.map(s => (
                                            <SourceBar
                                                key={s.source}
                                                {...s}
                                                maxVisitors={data.sourceBreakdown[0]?.visitors ?? 1}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Tendance quotidienne */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                                    <TrendingUp size={15} className="text-orange-500" />
                                    <h2 className="text-sm font-black uppercase italic tracking-wider dark:text-white">Tendance visiteurs / jour</h2>
                                </div>
                                <div className="px-5 pb-6 pt-4">
                                    {data.dailyTrend.length === 0 ? (
                                        <p className="text-center text-slate-400 text-sm py-4">Aucune donnée</p>
                                    ) : (
                                        <>
                                            <TrendChart data={data.dailyTrend} />
                                            <div className="flex gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                                    <span className="w-3 h-3 rounded-sm bg-orange-400 inline-block" /> Visiteurs / jour
                                                </span>
                                                <span className="text-[10px] text-slate-400">Survolez pour les détails</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Top villes + Nouveaux inscrits */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* Top villes */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                                    <MapPin size={15} className="text-orange-500" />
                                    <h2 className="text-sm font-black uppercase italic tracking-wider dark:text-white">Top villes (commandes)</h2>
                                </div>
                                {data.topCities.length === 0 ? (
                                    <p className="text-center text-slate-400 text-sm py-8">Aucune donnée</p>
                                ) : (
                                    <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                                        {data.topCities.map((c, i) => (
                                            <div key={c.city} className="flex items-center gap-4 px-5 py-3">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                                                    i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-white' : i === 2 ? 'bg-amber-700/60 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                                }`}>{i + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold dark:text-white">{c.city}</p>
                                                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                                                        <div
                                                            className="h-full bg-orange-400 rounded-full"
                                                            style={{ width: `${pct(c.orders, data.topCities[0].orders)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <span className="text-xs font-black text-orange-500 flex-shrink-0">{c.orders} cmd</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Détail sources avec UTM */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                                    <ShoppingCart size={15} className="text-orange-500" />
                                    <h2 className="text-sm font-black uppercase italic tracking-wider dark:text-white">Clics acheter par source</h2>
                                </div>
                                {data.sourceBreakdown.filter(s => s.checkout_starts > 0).length === 0 ? (
                                    <p className="text-center text-slate-400 text-sm py-8">
                                        {data.checkoutStarts === 0
                                            ? 'Aucun clic "Acheter" enregistré sur la période'
                                            : 'Aucune source avec clics acheter'}
                                    </p>
                                ) : (
                                    <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                                        {data.sourceBreakdown.filter(s => s.checkout_starts > 0).map(s => {
                                            const color = SOURCE_COLORS[s.source as TrafficSource] ?? '#94A3B8'
                                            const label = SOURCE_LABELS[s.source as TrafficSource] ?? s.source
                                            const maxC = data.sourceBreakdown.filter(x => x.checkout_starts > 0)[0]?.checkout_starts ?? 1
                                            return (
                                                <div key={s.source} className="px-5 py-3">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                                                            <span className="text-xs font-bold dark:text-white">{label}</span>
                                                        </div>
                                                        <span className="text-xs font-black text-orange-500">{s.checkout_starts} clics</span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full" style={{ width: `${pct(s.checkout_starts, maxC)}%`, background: color }} />
                                                    </div>
                                                    <p className="text-[9px] text-slate-400 mt-1">{s.visitors} visiteurs · {pct(s.checkout_starts, s.visitors)}% de conv.</p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Section comportement avancé ── */}
                        {behavior && (
                            <>
                                {/* Entonnoir comportemental */}
                                <div>
                                    <h2 className="text-xs font-black uppercase italic tracking-widest text-slate-400 mb-3">Entonnoir comportemental détaillé</h2>
                                    <BehaviorFunnel data={behavior} />
                                </div>

                                {/* KPIs comportementaux */}
                                {(behavior.funnelCounts.add_to_cart > 0 || behavior.vendorSignupStarted > 0 || behavior.whatsappClicks > 0) && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                                            <MousePointerClick size={14} className="text-purple-500 mb-2" />
                                            <p className="text-2xl font-black italic text-purple-500">{behavior.funnelCounts.add_to_cart.toLocaleString('fr-FR')}</p>
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">Ajouts panier</p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                                            <Store size={14} className="text-blue-500 mb-2" />
                                            <p className="text-2xl font-black italic text-blue-500">{behavior.vendorSignupCompleted.toLocaleString('fr-FR')}</p>
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">Inscriptions vendeur</p>
                                            {behavior.vendorSignupStarted > 0 && <p className="text-[9px] text-slate-400 mt-0.5">{behavior.vendorSignupStarted} commencées</p>}
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                                            <MessageCircle size={14} className="text-green-500 mb-2" />
                                            <p className="text-2xl font-black italic text-green-500">{behavior.whatsappClicks.toLocaleString('fr-FR')}</p>
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">Clics WhatsApp</p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                                            <AlertTriangle size={14} className="text-red-500 mb-2" />
                                            <p className="text-2xl font-black italic text-red-500">{behavior.ordersFailedCount.toLocaleString('fr-FR')}</p>
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">Commandes échouées</p>
                                        </div>
                                    </div>
                                )}

                                {/* Moyen de paiement + Appareils + Types utilisateurs */}
                                {(behavior.paymentMethodBreakdown.length > 0 || behavior.deviceBreakdown.length > 0 || behavior.userTypeBreakdown.length > 0) && (
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Moyens de paiement */}
                                        {behavior.paymentMethodBreakdown.length > 0 && (
                                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                                                    <h3 className="text-sm font-black uppercase italic tracking-wider dark:text-white">Moyens de paiement</h3>
                                                </div>
                                                <div className="px-5 py-3 space-y-3">
                                                    {behavior.paymentMethodBreakdown.map(b => {
                                                        const max = behavior.paymentMethodBreakdown[0]?.count ?? 1
                                                        return (
                                                            <div key={b.method}>
                                                                <div className="flex justify-between mb-1">
                                                                    <span className="text-xs font-bold dark:text-white">{PM_LABELS[b.method] ?? b.method}</span>
                                                                    <span className="text-xs font-black text-orange-500">{b.count}</span>
                                                                </div>
                                                                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(b.count / max) * 100}%` }} />
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Appareils */}
                                        {behavior.deviceBreakdown.length > 0 && (
                                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                                                    <h3 className="text-sm font-black uppercase italic tracking-wider dark:text-white">Appareils</h3>
                                                </div>
                                                <div className="px-5 py-4 space-y-4">
                                                    {behavior.deviceBreakdown.map(d => {
                                                        const max = behavior.deviceBreakdown[0]?.count ?? 1
                                                        return (
                                                            <div key={d.device} className="flex items-center gap-3">
                                                                {d.device === 'mobile' ? <Smartphone size={14} className="text-blue-500 flex-shrink-0" /> : <Monitor size={14} className="text-slate-500 flex-shrink-0" />}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex justify-between mb-1">
                                                                        <span className="text-xs font-bold dark:text-white capitalize">{d.device}</span>
                                                                        <span className="text-xs font-black text-orange-500">{d.count}</span>
                                                                    </div>
                                                                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(d.count / max) * 100}%` }} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Types utilisateurs */}
                                        {behavior.userTypeBreakdown.length > 0 && (
                                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                                                    <h3 className="text-sm font-black uppercase italic tracking-wider dark:text-white">Connectés vs Invités</h3>
                                                </div>
                                                <div className="px-5 py-4 space-y-4">
                                                    {behavior.userTypeBreakdown.map(u => {
                                                        const max = behavior.userTypeBreakdown[0]?.count ?? 1
                                                        const colors: Record<string, string> = { connected: '#22C55E', guest: '#F97316', anonymous: '#94A3B8' }
                                                        return (
                                                            <div key={u.type}>
                                                                <div className="flex justify-between mb-1">
                                                                    <span className="text-xs font-bold dark:text-white">{USER_TYPE_LABELS[u.type] ?? u.type}</span>
                                                                    <span className="text-xs font-black" style={{ color: colors[u.type] ?? '#94A3B8' }}>{u.count}</span>
                                                                </div>
                                                                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                    <div className="h-full rounded-full" style={{ width: `${(u.count / max) * 100}%`, background: colors[u.type] ?? '#94A3B8' }} />
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Principales erreurs */}
                                {behavior.topErrors.length > 0 && (
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-100 dark:border-red-900/30 overflow-hidden">
                                        <div className="flex items-center gap-2 px-5 py-4 border-b border-red-100 dark:border-red-900/30">
                                            <AlertTriangle size={15} className="text-red-500" />
                                            <h2 className="text-sm font-black uppercase italic tracking-wider text-red-600 dark:text-red-400">Principales erreurs</h2>
                                        </div>
                                        <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                                            {behavior.topErrors.map((e, i) => (
                                                <div key={i} className="px-5 py-3 flex items-center gap-4">
                                                    <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-[9px] font-black text-red-500 flex-shrink-0">{i + 1}</span>
                                                    <span className="flex-1 text-xs text-slate-600 dark:text-slate-300 font-mono truncate">{e.message}</span>
                                                    <span className="text-xs font-black text-red-500 flex-shrink-0">{e.count}×</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Vérifications vendeur */}
                                {behavior.vendorVerificationSubmitted > 0 && (
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                                        <div className="flex items-center gap-6 flex-wrap">
                                            <div>
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Vérifications soumises</p>
                                                <p className="text-3xl font-black italic text-blue-500">{behavior.vendorVerificationSubmitted}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Inscriptions démarrées</p>
                                                <p className="text-3xl font-black italic text-slate-500">{behavior.vendorSignupStarted}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Inscriptions finalisées</p>
                                                <p className="text-3xl font-black italic text-green-500">{behavior.vendorSignupCompleted}</p>
                                                {behavior.vendorSignupStarted > 0 && (
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{Math.round((behavior.vendorSignupCompleted / behavior.vendorSignupStarted) * 100)}% taux de complétion</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Note de bas de page */}
                        <p className="text-[10px] text-slate-400 text-center pb-4">
                            Les données de trafic sont basées sur les sessions anonymes. Les clics "Acheter" sont trackés à partir du bouton Commander. La section « Entonnoir comportemental » nécessite l'application de la migration <code className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1 rounded">supabase-migration-behavior-events.sql</code>.
                        </p>
                    </>
                ) : null}
            </div>
        </div>
    )
}
