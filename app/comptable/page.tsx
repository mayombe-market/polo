'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getFinancialDashboard } from '@/app/actions/comptable'
import { Loader2, TrendingUp, Wallet, CreditCard, Building2, AlertTriangle, ArrowRight, Clock, CheckCircle } from 'lucide-react'
import { formatAdminDateTime } from '@/lib/formatDateTime'

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

export default function ComptableDashboard() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        getFinancialDashboard()
            .then(d => { setData(d); setLoading(false) })
            .catch(() => { setError(true); setLoading(false) })
    }, [])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <Loader2 size={36} className="animate-spin text-green-500" />
        </div>
    )

    if (error || !data) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950 px-4 text-center">
            <p className="text-2xl">⚙️</p>
            <p className="font-black text-slate-700 dark:text-white">Configuration manquante</p>
            <p className="text-sm text-slate-400 max-w-sm">
                La clé <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">SUPABASE_SERVICE_ROLE_KEY</code> n'est pas configurée dans <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">.env.local</code>.
                Récupère-la dans Supabase → Settings → API.
            </p>
        </div>
    )

    const d = data!
    const now = new Date()
    const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 py-8 px-4">
                <div className="max-w-6xl mx-auto">
                    <p className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-1">Tableau de bord financier</p>
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter dark:text-white">
                        Mayombe <span className="text-green-500">Market</span>
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">{monthLabel} · Résumé financier</p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

                {/* ─── ALERTE payouts en retard ─── */}
                {d.payouts.lateCount > 0 && (
                    <Link href="/comptable/payouts" className="no-underline block">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 hover:border-red-400 transition-colors">
                            <AlertTriangle size={22} className="text-red-500 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="font-black text-red-700 dark:text-red-400 text-sm">
                                    {d.payouts.lateCount} payout{d.payouts.lateCount > 1 ? 's' : ''} en retard de +7 jours
                                </p>
                                <p className="text-red-400 text-xs mt-0.5">Des vendeurs attendent leur règlement. Traiter maintenant →</p>
                            </div>
                        </div>
                    </Link>
                )}

                {/* ─── KPIs PRINCIPAUX ─── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        {
                            label: 'Revenu plateforme\nce mois', val: d.revenue.month,
                            sub: `${fmt(d.revenue.year)} F cette année`,
                            color: 'text-green-600', border: 'border-green-200 dark:border-green-800/30',
                            bg: 'bg-green-50 dark:bg-green-900/10', icon: <TrendingUp size={18} className="text-green-500" />,
                        },
                        {
                            label: 'Commissions\ncommandes', val: d.commissions.month,
                            sub: `${fmt(d.commissions.year)} F cette année`,
                            color: 'text-blue-600', border: 'border-blue-200 dark:border-blue-800/30',
                            bg: 'bg-blue-50 dark:bg-blue-900/10', icon: <TrendingUp size={18} className="text-blue-500" />,
                        },
                        {
                            label: 'Abonnements\nce mois', val: d.subscriptions.month,
                            sub: `${fmt(d.subscriptions.year)} F cette année`,
                            color: 'text-purple-600', border: 'border-purple-200 dark:border-purple-800/30',
                            bg: 'bg-purple-50 dark:bg-purple-900/10', icon: <CreditCard size={18} className="text-purple-500" />,
                        },
                        {
                            label: 'Payouts vendeurs\nen attente', val: d.payouts.pendingAmount,
                            sub: `${d.payouts.pendingCount} vendeur${d.payouts.pendingCount > 1 ? 's' : ''} à payer`,
                            color: d.payouts.lateCount > 0 ? 'text-red-600' : 'text-amber-600',
                            border: d.payouts.lateCount > 0 ? 'border-red-200 dark:border-red-800/30' : 'border-amber-200 dark:border-amber-800/30',
                            bg: d.payouts.lateCount > 0 ? 'bg-red-50 dark:bg-red-900/10' : 'bg-amber-50 dark:bg-amber-900/10',
                            icon: <Wallet size={18} className={d.payouts.lateCount > 0 ? 'text-red-500' : 'text-amber-500'} />,
                        },
                    ].map((kpi, i) => (
                        <div key={i} className={`p-5 rounded-2xl border ${kpi.border} ${kpi.bg}`}>
                            <div className="mb-3">{kpi.icon}</div>
                            <p className={`text-2xl font-black italic tracking-tighter ${kpi.color}`}>
                                {fmt(kpi.val)} <span className="text-sm font-bold">F</span>
                            </p>
                            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mt-1 whitespace-pre-line leading-4">
                                {kpi.label}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">{kpi.sub}</p>
                        </div>
                    ))}
                </div>

                {/* ─── DEUX COLONNES ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Répartition abonnements */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xs font-black uppercase italic tracking-wider dark:text-white">
                                Abonnements — répartition {monthLabel}
                            </h2>
                            <Link href="/comptable/abonnements" className="text-[10px] font-bold text-green-500 hover:underline no-underline">
                                Voir tout →
                            </Link>
                        </div>
                        {Object.keys(d.subscriptions.breakdown).length === 0 ? (
                            <p className="text-sm text-slate-400 italic text-center py-6">Aucun abonnement ce mois</p>
                        ) : (
                            <div className="space-y-3">
                                {Object.entries(d.subscriptions.breakdown).map(([type, amount]: [string, any]) => {
                                    const pct = d.subscriptions.month > 0
                                        ? Math.round((amount / d.subscriptions.month) * 100)
                                        : 0
                                    const color = type === 'Hôtel' ? '#F59E0B' : type === 'Immo' ? '#3B82F6' : '#8B5CF6'
                                    return (
                                        <div key={type}>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{type}</span>
                                                <span className="text-xs font-black text-slate-900 dark:text-white">{fmt(amount)} F</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                                            </div>
                                        </div>
                                    )
                                })}
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                                    <span className="text-xs font-black uppercase text-slate-400">Total</span>
                                    <span className="text-sm font-black text-green-600">{fmt(d.subscriptions.month)} F</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Derniers payouts effectués */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xs font-black uppercase italic tracking-wider dark:text-white">
                                Derniers payouts effectués
                            </h2>
                            <Link href="/comptable/payouts" className="text-[10px] font-bold text-green-500 hover:underline no-underline">
                                Gérer →
                            </Link>
                        </div>
                        {d.payouts.recentPaid.length === 0 ? (
                            <p className="text-sm text-slate-400 italic text-center py-6">Aucun payout enregistré</p>
                        ) : (
                            <div className="space-y-2">
                                {d.payouts.recentPaid.map((p: any) => (
                                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
                                        <div>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                                                {(p.profiles as any)?.shop_name || 'Vendeur'}
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                {p.payout_reference || '—'} · {p.payout_date ? formatAdminDateTime(p.payout_date) : '—'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-green-600">{fmt(p.vendor_payout || 0)} F</p>
                                            <div className="flex items-center gap-1 justify-end mt-0.5">
                                                <CheckCircle size={9} className="text-green-500" />
                                                <span className="text-[9px] text-green-500 font-bold">Payé</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Résumé payouts en attente */}
                        {d.payouts.pendingCount > 0 && (
                            <Link href="/comptable/payouts" className="no-underline block mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40 hover:bg-amber-100 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-amber-500" />
                                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                            {d.payouts.pendingCount} payout{d.payouts.pendingCount > 1 ? 's' : ''} en attente
                                        </span>
                                    </div>
                                    <span className="text-sm font-black text-amber-600">{fmt(d.payouts.pendingAmount)} F</span>
                                </div>
                            </Link>
                        )}
                    </div>
                </div>

                {/* ─── LIENS RAPIDES ─── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { href: '/comptable/payouts',     label: 'Payer les vendeurs',   icon: '💸', color: 'hover:border-amber-300' },
                        { href: '/comptable/abonnements', label: 'Revenus abonnements',  icon: '📋', color: 'hover:border-purple-300' },
                        { href: '/comptable/virements',   label: 'Virements banque',     icon: '🏦', color: 'hover:border-blue-300' },
                        { href: '/comptable/export',      label: 'Exporter CSV',         icon: '📥', color: 'hover:border-green-300' },
                    ].map(l => (
                        <Link key={l.href} href={l.href}
                            className={`group p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 ${l.color} transition-all no-underline flex flex-col items-center gap-2 text-center`}>
                            <span className="text-2xl">{l.icon}</span>
                            <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">{l.label}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
