'use client'

import { useState, useEffect } from 'react'
import { getOrdersJournal } from '@/app/actions/comptable'
import { exportCSV, csvFilename } from '@/lib/exportCSV'
import { Loader2, RefreshCw, Download } from 'lucide-react'
import { toast } from 'sonner'

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

function toLocalDate(d: Date) {
    return d.toISOString().slice(0, 10)
}

// Calcul échéance payout : J+7 après la création de la commande livrée
function getPayoutDeadline(createdAt: string) {
    const d = new Date(createdAt)
    d.setDate(d.getDate() + 7)
    return d
}

function getDaysUntilDeadline(createdAt: string) {
    const deadline = getPayoutDeadline(createdAt)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    deadline.setHours(0, 0, 0, 0)
    return Math.ceil((deadline.getTime() - now.getTime()) / 86400000)
}

function PayoutDeadlineBadge({ order }: { order: any }) {
    if (order.payout_status === 'paid') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                ✓ Payé
            </span>
        )
    }
    if (!['delivered'].includes(order.status)) {
        return <span className="text-[10px] text-slate-300">—</span>
    }

    const days = getDaysUntilDeadline(order.created_at)
    const deadline = getPayoutDeadline(order.created_at)
    const label = deadline.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })

    if (days < 0) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse">
                🔴 {Math.abs(days)}j dépassé
            </span>
        )
    }
    if (days === 0) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                🔴 Aujourd'hui
            </span>
        )
    }
    if (days <= 3) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                🟡 {label} ({days}j)
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {label} ({days}j)
        </span>
    )
}

function rowBg(order: any) {
    if (order.payout_status === 'paid') return ''
    if (!['delivered'].includes(order.status)) return ''
    const days = getDaysUntilDeadline(order.created_at)
    if (days < 0) return 'bg-red-50 dark:bg-red-950/20'
    if (days === 0) return 'bg-red-50 dark:bg-red-950/20'
    if (days <= 3) return 'bg-yellow-50 dark:bg-yellow-950/20'
    return ''
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending:    { label: 'En attente',  color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
    confirmed:  { label: 'Confirmée',   color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    processing: { label: 'En cours',    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    shipped:    { label: 'Expédiée',    color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
    picked_up:  { label: 'Récupérée',   color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
    delivered:  { label: 'Livrée',      color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
    rejected:   { label: 'Annulée',     color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
    cancelled:  { label: 'Annulée',     color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
}

export default function JournalPage() {
    const today = toLocalDate(new Date())
    const [startDate, setStartDate] = useState(today)
    const [endDate, setEndDate]     = useState(today)
    const [orders, setOrders]       = useState<any[]>([])
    const [loading, setLoading]     = useState(true)
    const [error, setError]         = useState(false)

    const load = async (s = startDate, e = endDate) => {
        setLoading(true)
        setError(false)
        try {
            const res = await getOrdersJournal({ startDate: s, endDate: e })
            if (res.error) { setError(true); toast.error(res.error) }
            else setOrders(res.data)
        } catch { setError(true) }
        finally { setLoading(false) }
    }

    useEffect(() => { load() }, [])

    // Stats rapides
    const totalCA       = orders.reduce((s, o) => s + (o.total_amount || 0), 0)
    const totalCommis   = orders.reduce((s, o) => s + (o.commission_amount || 0), 0)
    const totalPayouts  = orders.filter(o => o.status === 'delivered' && o.payout_status !== 'paid')
                                .reduce((s, o) => s + (o.vendor_payout || Math.round((o.total_amount || 0) * 0.9)), 0)
    const lateCount     = orders.filter(o => o.status === 'delivered' && o.payout_status !== 'paid' && getDaysUntilDeadline(o.created_at) <= 0).length
    const soonCount     = orders.filter(o => o.status === 'delivered' && o.payout_status !== 'paid' && getDaysUntilDeadline(o.created_at) > 0 && getDaysUntilDeadline(o.created_at) <= 3).length

    const setQuick = (range: 'today' | 'yesterday' | 'week' | 'month') => {
        const now = new Date()
        if (range === 'today') {
            const d = toLocalDate(now)
            setStartDate(d); setEndDate(d); load(d, d)
        } else if (range === 'yesterday') {
            const d = new Date(now); d.setDate(d.getDate() - 1)
            const s = toLocalDate(d)
            setStartDate(s); setEndDate(s); load(s, s)
        } else if (range === 'week') {
            const s = new Date(now); s.setDate(s.getDate() - 6)
            const sd = toLocalDate(s); const ed = toLocalDate(now)
            setStartDate(sd); setEndDate(ed); load(sd, ed)
        } else if (range === 'month') {
            const s = new Date(now.getFullYear(), now.getMonth(), 1)
            const sd = toLocalDate(s); const ed = toLocalDate(now)
            setStartDate(sd); setEndDate(ed); load(sd, ed)
        }
    }

    const handleExport = () => {
        if (orders.length === 0) { toast.warning('Aucune donnée à exporter'); return }
        exportCSV(orders, [
            { header: 'Date',           accessor: (o: any) => o.created_at?.slice(0, 10) },
            { header: 'Heure',          accessor: (o: any) => o.created_at?.slice(11, 16) },
            { header: 'Réf',            accessor: (o: any) => o.id?.slice(0, 8).toUpperCase() },
            { header: 'Transaction',    accessor: (o: any) => o.transaction_id || '' },
            { header: 'Vendeur',        accessor: (o: any) => (o.profiles as any)?.shop_name || (o.profiles as any)?.full_name || '' },
            { header: 'Produit',        accessor: (o: any) => o.items?.[0]?.name || '' },
            { header: 'Client',         accessor: (o: any) => o.customer_name || '' },
            { header: 'Téléphone',      accessor: (o: any) => o.customer_phone || '' },
            { header: 'Ville',          accessor: (o: any) => o.customer_city || '' },
            { header: 'Montant (F)',    accessor: (o: any) => o.total_amount || 0 },
            { header: 'Commission (F)', accessor: (o: any) => o.commission_amount || 0 },
            { header: 'Payout (F)',     accessor: (o: any) => o.vendor_payout || 0 },
            { header: 'Statut',         accessor: (o: any) => STATUS_LABELS[o.status]?.label || o.status },
            { header: 'Paiement reçu',  accessor: (o: any) => o.received_sim?.toUpperCase() || '' },
            { header: 'Payout statut',  accessor: (o: any) => o.payout_status === 'paid' ? 'Payé' : 'En attente' },
            { header: 'Payout date',    accessor: (o: any) => o.payout_date?.slice(0, 10) || '' },
            { header: 'Payout réf',     accessor: (o: any) => o.payout_reference || '' },
            { header: 'Échéance J+7',   accessor: (o: any) => o.status === 'delivered' ? getPayoutDeadline(o.created_at).toISOString().slice(0, 10) : '' },
        ], csvFilename('journal'))
        toast.success(`${orders.length} lignes exportées`)
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 py-5 px-4">
                <div className="max-w-full mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-lg font-black uppercase italic tracking-tight dark:text-white">Journal des commandes</h1>
                            <p className="text-[10px] text-slate-400">
                                {orders.length} commandes
                                {lateCount > 0 && <span className="text-red-500 font-bold"> · {lateCount} payout{lateCount > 1 ? 's' : ''} en retard 🔴</span>}
                                {soonCount > 0 && <span className="text-yellow-500 font-bold"> · {soonCount} à payer bientôt 🟡</span>}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => load()} disabled={loading} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                                <RefreshCw size={14} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-bold">
                                <Download size={13} /> Excel
                            </button>
                        </div>
                    </div>

                    {/* Filtres */}
                    <div className="flex gap-2 flex-wrap items-end">
                        <div className="flex gap-1.5 flex-wrap">
                            {[
                                { key: 'today',     label: "Aujourd'hui" },
                                { key: 'yesterday', label: 'Hier' },
                                { key: 'week',      label: '7 derniers jours' },
                                { key: 'month',     label: 'Ce mois' },
                            ].map(r => (
                                <button key={r.key} onClick={() => setQuick(r.key as any)}
                                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700 transition-colors">
                                    {r.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 items-end ml-auto">
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Du</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                    className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400" />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Au</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                    className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400" />
                            </div>
                            <button onClick={() => load()} className="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-bold">
                                Filtrer
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPIs rapides */}
            <div className="px-4 py-3 grid grid-cols-3 gap-3 max-w-full">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 px-4 py-3">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Chiffre d'affaires</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white">{fmt(totalCA)} <span className="text-xs font-bold">F</span></p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 px-4 py-3">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Commissions</p>
                    <p className="text-lg font-black text-green-600">{fmt(totalCommis)} <span className="text-xs font-bold">F</span></p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 px-4 py-3">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Payouts dus</p>
                    <p className={`text-lg font-black ${lateCount > 0 ? 'text-red-600' : 'text-amber-600'}`}>{fmt(totalPayouts)} <span className="text-xs font-bold">F</span></p>
                </div>
            </div>

            {/* Légende couleurs */}
            <div className="px-4 pb-2 flex gap-3 flex-wrap">
                <span className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="w-3 h-3 rounded-full bg-red-200 inline-block" /> Payout en retard / aujourd'hui</span>
                <span className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="w-3 h-3 rounded-full bg-yellow-200 inline-block" /> Payout dans 1-3 jours</span>
                <span className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="w-3 h-3 rounded-full bg-green-200 inline-block" /> Payout effectué</span>
            </div>

            {/* Tableau */}
            <div className="px-4 pb-8">
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-green-500" /></div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-sm font-bold text-red-500">Erreur de chargement</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-sm font-bold text-slate-400">Aucune commande sur cette période</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs min-w-[1100px]">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-100 dark:border-slate-800">
                                        <th className="text-left px-3 py-2.5 font-black uppercase text-[9px] text-slate-400 tracking-wider whitespace-nowrap">Date · Heure</th>
                                        <th className="text-left px-3 py-2.5 font-black uppercase text-[9px] text-slate-400 tracking-wider whitespace-nowrap">Réf</th>
                                        <th className="text-left px-3 py-2.5 font-black uppercase text-[9px] text-slate-400 tracking-wider whitespace-nowrap">Vendeur</th>
                                        <th className="text-left px-3 py-2.5 font-black uppercase text-[9px] text-slate-400 tracking-wider whitespace-nowrap">Produit</th>
                                        <th className="text-left px-3 py-2.5 font-black uppercase text-[9px] text-slate-400 tracking-wider whitespace-nowrap">Client</th>
                                        <th className="text-right px-3 py-2.5 font-black uppercase text-[9px] text-slate-400 tracking-wider whitespace-nowrap">Montant</th>
                                        <th className="text-right px-3 py-2.5 font-black uppercase text-[9px] text-slate-400 tracking-wider whitespace-nowrap">Commission</th>
                                        <th className="text-right px-3 py-2.5 font-black uppercase text-[9px] text-slate-400 tracking-wider whitespace-nowrap">Payout</th>
                                        <th className="text-center px-3 py-2.5 font-black uppercase text-[9px] text-slate-400 tracking-wider whitespace-nowrap">Statut</th>
                                        <th className="text-center px-3 py-2.5 font-black uppercase text-[9px] text-slate-400 tracking-wider whitespace-nowrap">Paiement</th>
                                        <th className="text-center px-3 py-2.5 font-black uppercase text-[9px] text-slate-400 tracking-wider whitespace-nowrap">Échéance payout</th>
                                        <th className="text-left px-3 py-2.5 font-black uppercase text-[9px] text-slate-400 tracking-wider whitespace-nowrap">Réf payout</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {orders.map(order => {
                                        const bg = rowBg(order)
                                        const st = STATUS_LABELS[order.status] || { label: order.status, color: 'text-slate-500 bg-slate-50' }
                                        const vendorName = (order.profiles as any)?.shop_name || (order.profiles as any)?.full_name || '—'
                                        const productName = order.items?.[0]?.name || '—'
                                        const payout = order.vendor_payout || Math.round((order.total_amount || 0) * 0.9)

                                        return (
                                            <tr key={order.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors ${bg}`}>
                                                <td className="px-3 py-2.5 whitespace-nowrap">
                                                    <p className="font-bold text-slate-900 dark:text-white">{order.created_at?.slice(0, 10)}</p>
                                                    <p className="text-slate-400">{order.created_at?.slice(11, 16)}</p>
                                                </td>
                                                <td className="px-3 py-2.5 whitespace-nowrap">
                                                    <p className="font-black text-slate-700 dark:text-slate-300 font-mono">{order.id?.slice(0, 8).toUpperCase()}</p>
                                                    {order.transaction_id && <p className="text-slate-400 text-[9px]">{order.transaction_id}</p>}
                                                </td>
                                                <td className="px-3 py-2.5 whitespace-nowrap">
                                                    <p className="font-bold text-slate-900 dark:text-white max-w-[120px] truncate">{vendorName}</p>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <p className="text-slate-700 dark:text-slate-300 max-w-[150px] truncate">{productName}</p>
                                                    {order.items?.length > 1 && <p className="text-slate-400 text-[9px]">+{order.items.length - 1} autre(s)</p>}
                                                </td>
                                                <td className="px-3 py-2.5 whitespace-nowrap">
                                                    <p className="font-medium text-slate-700 dark:text-slate-300">{order.customer_name || '—'}</p>
                                                    <p className="text-slate-400 text-[9px]">{order.customer_city || ''}</p>
                                                </td>
                                                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                                    <p className="font-black text-slate-900 dark:text-white">{fmt(order.total_amount || 0)}</p>
                                                </td>
                                                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                                    <p className="font-bold text-green-600">{fmt(order.commission_amount || 0)}</p>
                                                </td>
                                                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                                    <p className="font-bold text-amber-600">{fmt(payout)}</p>
                                                </td>
                                                <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${st.color}`}>
                                                        {st.label}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                                    {order.received_sim ? (
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                                            order.received_sim === 'mtn' ? 'bg-yellow-100 text-yellow-700' :
                                                            order.received_sim === 'airtel' ? 'bg-red-100 text-red-600' :
                                                            'bg-slate-100 text-slate-500'
                                                        }`}>
                                                            {order.received_sim.toUpperCase()}
                                                        </span>
                                                    ) : <span className="text-slate-300">—</span>}
                                                </td>
                                                <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                                    <PayoutDeadlineBadge order={order} />
                                                </td>
                                                <td className="px-3 py-2.5 whitespace-nowrap">
                                                    {order.payout_reference ? (
                                                        <p className="text-[10px] text-green-600 font-mono">{order.payout_reference}</p>
                                                    ) : <span className="text-slate-300">—</span>}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>

                                {/* Totaux */}
                                <tfoot>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-t-2 border-slate-200 dark:border-slate-700">
                                        <td colSpan={5} className="px-3 py-2.5 text-[10px] font-black uppercase text-slate-500">
                                            Total — {orders.length} commandes
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-black text-slate-900 dark:text-white whitespace-nowrap">{fmt(totalCA)} F</td>
                                        <td className="px-3 py-2.5 text-right font-black text-green-600 whitespace-nowrap">{fmt(totalCommis)} F</td>
                                        <td className="px-3 py-2.5 text-right font-black text-amber-600 whitespace-nowrap">{fmt(totalPayouts)} F</td>
                                        <td colSpan={4} />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
