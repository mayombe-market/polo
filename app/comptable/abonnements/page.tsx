'use client'

import { useEffect, useState } from 'react'
import { getSubscriptionRevenue } from '@/app/actions/comptable'
import { Loader2, RefreshCw, CreditCard } from 'lucide-react'
import { formatAdminDateTime } from '@/lib/formatDateTime'

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

const PLAN_LABELS: Record<string, string> = {
    starter: '🛍 Starter', pro: '🛍 Pro', premium: '🛍 Premium',
    immo_agent: '🏠 Agent', immo_agence: '🏠 Agence',
    hotel_pro: '🏨 Hôtel de Quartier', hotel_chain: '🏨 Grand Hôtel',
}

export default function AbonnementsPage() {
    const [data, setData] = useState<any[]>([])
    const [byMonth, setByMonth] = useState<Record<string, any>>({})
    const [loading, setLoading] = useState(true)
    const [expandedMonth, setExpandedMonth] = useState<string | null>(null)

    // Filtres
    const now = new Date()
    const defaultStart = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10)
    const defaultEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
    const [startDate, setStartDate] = useState(defaultStart)
    const [endDate, setEndDate]     = useState(defaultEnd)

    const load = async () => {
        setLoading(true)
        const res = await getSubscriptionRevenue({ startDate, endDate })
        setData(res.data || [])
        setByMonth(res.byMonth || {})
        setLoading(false)
        // Ouvrir le mois le plus récent par défaut
        const months = Object.keys(res.byMonth || {}).sort().reverse()
        if (months[0]) setExpandedMonth(months[0])
    }

    useEffect(() => { load() }, [])

    const totalRevenue = data.reduce((s, r) => s + (r.total_amount || 0), 0)
    const months = Object.keys(byMonth).sort().reverse()

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 py-6 px-4">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-lg font-black uppercase italic tracking-tight dark:text-white">Revenus abonnements</h1>
                            <p className="text-[10px] text-slate-400">{data.length} paiements · {fmt(totalRevenue)} F sur la période</p>
                        </div>
                        <button onClick={load} disabled={loading} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                            <RefreshCw size={14} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Filtres date */}
                    <div className="flex gap-2 flex-wrap items-end">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Du</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Au</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400" />
                        </div>
                        <button onClick={load} className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-bold">
                            Filtrer
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-green-500" /></div>
                ) : months.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                        <CreditCard size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                        <p className="text-sm font-bold text-slate-400">Aucun abonnement sur cette période</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {months.map(month => {
                            const m = byMonth[month]
                            const isExpanded = expandedMonth === month
                            const [year, mo] = month.split('-')
                            const label = new Date(+year, +mo - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

                            return (
                                <div key={month} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                    <button
                                        onClick={() => setExpandedMonth(isExpanded ? null : month)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <div className="text-left">
                                            <p className="font-black text-slate-900 dark:text-white capitalize">{label}</p>
                                            <p className="text-[10px] text-slate-400">{m.count} paiement{m.count > 1 ? 's' : ''}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-green-600">{fmt(m.total)} F</p>
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t border-slate-100 dark:border-slate-800">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                                                        <th className="text-left px-4 py-2 font-black uppercase text-slate-400 text-[9px] tracking-wider">Vendeur</th>
                                                        <th className="text-left px-4 py-2 font-black uppercase text-slate-400 text-[9px] tracking-wider">Plan</th>
                                                        <th className="text-right px-4 py-2 font-black uppercase text-slate-400 text-[9px] tracking-wider">Montant</th>
                                                        <th className="text-right px-4 py-2 font-black uppercase text-slate-400 text-[9px] tracking-wider">Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                    {m.rows.map((r: any) => {
                                                        const planKey = r.items?.[0]?.plan_id || (r.profiles as any)?.subscription_plan || ''
                                                        return (
                                                            <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                                <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">
                                                                    {(r.profiles as any)?.shop_name || (r.profiles as any)?.full_name || '—'}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-slate-500">
                                                                    {PLAN_LABELS[planKey] || planKey || r.items?.[0]?.name || '—'}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-right font-black text-green-600">
                                                                    {fmt(r.total_amount || 0)} F
                                                                </td>
                                                                <td className="px-4 py-2.5 text-right text-slate-400">
                                                                    {formatAdminDateTime(r.created_at)}
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="bg-green-50 dark:bg-green-900/20">
                                                        <td colSpan={2} className="px-4 py-2 font-black text-green-700 dark:text-green-400 text-[10px] uppercase">Total {label}</td>
                                                        <td className="px-4 py-2 text-right font-black text-green-700 dark:text-green-400">{fmt(m.total)} F</td>
                                                        <td />
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        {/* Total global */}
                        <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200/60 dark:border-green-800/40 flex justify-between">
                            <span className="text-xs font-black uppercase text-green-700 dark:text-green-400">Total période</span>
                            <span className="text-xl font-black text-green-700 dark:text-green-400">{fmt(totalRevenue)} F</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
