'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getOrdersJournal, markPayoutPaid, saveVendorPayoutPhone } from '@/app/actions/comptable'
import { exportCSV, csvFilename } from '@/lib/exportCSV'
import { Loader2, RefreshCw, Download, X, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/useRealtime'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

function toLocalDate(d: Date) { return d.toISOString().slice(0, 10) }

function getPayoutDeadline(createdAt: string) {
    const d = new Date(createdAt)
    d.setDate(d.getDate() + 7)
    return d
}

function getDaysUntil(createdAt: string) {
    const deadline = getPayoutDeadline(createdAt)
    const now = new Date(); now.setHours(0,0,0,0); deadline.setHours(0,0,0,0)
    return Math.ceil((deadline.getTime() - now.getTime()) / 86400000)
}

function rowBg(order: any) {
    if (order.payout_status === 'paid') return 'bg-green-50/60 dark:bg-green-950/10'
    if (order.status !== 'delivered') return ''
    const d = getDaysUntil(order.created_at)
    if (d <= 0) return 'bg-red-50 dark:bg-red-950/20'
    if (d <= 3) return 'bg-yellow-50 dark:bg-yellow-950/20'
    return ''
}

function EcheanceBadge({ order }: { order: any }) {
    if (order.payout_status === 'paid') return (
        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">✓ Payé</span>
    )
    if (order.status !== 'delivered') return <span className="text-slate-300 text-[10px]">—</span>
    const days = getDaysUntil(order.created_at)
    const label = getPayoutDeadline(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    if (days < 0) return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse">🔴 {Math.abs(days)}j retard</span>
    if (days === 0) return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">🔴 Aujourd'hui</span>
    if (days <= 3) return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">🟡 {label} ({days}j)</span>
    return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">{label} ({days}j)</span>
}

const STATUS: Record<string, { label: string; color: string }> = {
    pending:    { label: 'En attente',  color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
    confirmed:  { label: 'Confirmée',   color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    processing: { label: 'En cours',    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    shipped:    { label: 'Expédiée',    color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
    picked_up:  { label: 'Récupérée',   color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
    delivered:  { label: '✓ Livrée',    color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
    rejected:   { label: 'Annulée',     color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
    cancelled:  { label: 'Annulée',     color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
}

// ── Mini-modal paiement inline ──────────────────────────────────
function PayModal({ order, onClose, onDone }: { order: any; onClose: () => void; onDone: (orderId: string) => void }) {
    const [phone, setPhone] = useState((order.profiles as any)?.payout_phone || (order.profiles as any)?.phone || '')
    const [ref, setRef] = useState('')
    const [note, setNote] = useState('')
    const [saving, setSaving] = useState(false)

    const handlePay = async () => {
        if (!phone.trim() || !ref.trim()) { toast.error('Numéro MoMo et référence obligatoires'); return }
        setSaving(true)
        const vendorId = (order.profiles as any)?.id
        if (vendorId && phone !== (order.profiles as any)?.payout_phone) {
            await saveVendorPayoutPhone(vendorId, phone)
        }
        const res = await markPayoutPaid({ orderId: order.id, reference: ref, phone, note })
        setSaving(false)
        if (res.success) {
            toast.success('Payout enregistré ✓')
            onDone(order.id)
        } else {
            toast.error((res as any).error || 'Erreur')
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 max-w-sm w-full shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="font-black text-slate-900 dark:text-white text-sm">Payer {(order.profiles as any)?.shop_name || 'Vendeur'}</p>
                        <p className="text-xs text-slate-400">Montant : <span className="font-black text-green-600">{fmt(order.vendor_payout || Math.round((order.total_amount || 0) * 0.9))} F</span></p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X size={14} /></button>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Numéro MoMo <span className="text-red-400">*</span></label>
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="06 XXX XX XX"
                            className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Référence MoMo <span className="text-red-400">*</span></label>
                        <input type="text" value={ref} onChange={e => setRef(e.target.value)} placeholder="Ex: CI241023ABCD"
                            className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Note (optionnel)</label>
                        <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Ex: paiement commande du 21/04"
                            className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400" />
                    </div>
                </div>
                <div className="flex gap-2 mt-4">
                    <button onClick={handlePay} disabled={saving}
                        className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <><Send size={13} /> Confirmer</>}
                    </button>
                    <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-800">
                        Annuler
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Page principale ─────────────────────────────────────────────
export default function JournalPage() {
    const today = toLocalDate(new Date())
    const [startDate, setStartDate] = useState(today)
    const [endDate, setEndDate]     = useState(today)
    const [orders, setOrders]       = useState<any[]>([])
    const [loading, setLoading]     = useState(true)
    const [paying, setPaying]       = useState<any | null>(null)
    const [newCount, setNewCount]   = useState(0)
    const startRef = useRef(startDate)
    const endRef   = useRef(endDate)
    startRef.current = startDate
    endRef.current   = endDate

    const load = useCallback(async (s = startRef.current, e = endRef.current) => {
        setLoading(true)
        try {
            const res = await getOrdersJournal({ startDate: s, endDate: e })
            setOrders(res.data || [])
            setNewCount(0)
        } catch { toast.error('Erreur de chargement') }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { load(today, today) }, [])

    // ── Temps réel ──
    useRealtime('order:insert', () => setNewCount(n => n + 1))
    useRealtime('order:update', (payload) => {
        // Mise à jour inline de la commande modifiée
        setOrders(prev => prev.map(o =>
            o.id === payload.new?.id ? { ...o, ...payload.new } : o
        ))
    })

    // Marquer une commande comme payée localement
    const handlePayDone = (orderId: string) => {
        setPaying(null)
        setOrders(prev => prev.map(o =>
            o.id === orderId ? { ...o, payout_status: 'paid', payout_date: new Date().toISOString() } : o
        ))
    }

    const setQuick = (range: 'today' | 'yesterday' | 'week' | 'month') => {
        const now = new Date()
        let s: string, e: string
        if (range === 'today') {
            s = e = toLocalDate(now)
        } else if (range === 'yesterday') {
            const d = new Date(now); d.setDate(d.getDate() - 1); s = e = toLocalDate(d)
        } else if (range === 'week') {
            const d = new Date(now); d.setDate(d.getDate() - 6); s = toLocalDate(d); e = toLocalDate(now)
        } else {
            s = toLocalDate(new Date(now.getFullYear(), now.getMonth(), 1)); e = toLocalDate(now)
        }
        setStartDate(s); setEndDate(e); load(s, e)
    }

    const handleExport = () => {
        if (!orders.length) { toast.warning('Aucune donnée'); return }
        exportCSV(orders, [
            { header: 'Date',           accessor: (o: any) => o.created_at?.slice(0, 10) },
            { header: 'Heure',          accessor: (o: any) => o.created_at?.slice(11, 16) },
            { header: 'Réf',            accessor: (o: any) => o.id?.slice(0, 8).toUpperCase() },
            { header: 'Transaction',    accessor: (o: any) => o.transaction_id || '' },
            { header: 'Vendeur',        accessor: (o: any) => (o.profiles as any)?.shop_name || '' },
            { header: 'Produit',        accessor: (o: any) => o.items?.[0]?.name || '' },
            { header: 'Client',         accessor: (o: any) => o.customer_name || '' },
            { header: 'Téléphone',      accessor: (o: any) => o.customer_phone || '' },
            { header: 'Ville',          accessor: (o: any) => o.customer_city || '' },
            { header: 'Montant (F)',    accessor: (o: any) => o.total_amount || 0 },
            { header: 'Commission (F)', accessor: (o: any) => o.commission_amount || 0 },
            { header: 'Payout (F)',     accessor: (o: any) => o.vendor_payout || Math.round((o.total_amount || 0) * 0.9) },
            { header: 'Statut',         accessor: (o: any) => STATUS[o.status]?.label || o.status },
            { header: 'Paiement reçu',  accessor: (o: any) => o.received_sim?.toUpperCase() || '' },
            { header: 'Payout statut',  accessor: (o: any) => o.payout_status === 'paid' ? 'Payé' : 'En attente' },
            { header: 'Date payout',    accessor: (o: any) => o.payout_date?.slice(0, 10) || '' },
            { header: 'Réf payout',     accessor: (o: any) => o.payout_reference || '' },
            { header: 'Échéance J+7',   accessor: (o: any) => o.status === 'delivered' ? getPayoutDeadline(o.created_at).toISOString().slice(0, 10) : '' },
        ], csvFilename('journal'))
        toast.success(`${orders.length} lignes exportées`)
    }

    const totalCA      = orders.reduce((s, o) => s + (o.total_amount || 0), 0)
    const totalCommis  = orders.reduce((s, o) => s + (o.commission_amount || 0), 0)
    const totalPayouts = orders.filter(o => o.status === 'delivered' && o.payout_status !== 'paid').reduce((s, o) => s + (o.vendor_payout || Math.round((o.total_amount || 0) * 0.9)), 0)
    const lateCount    = orders.filter(o => o.status === 'delivered' && o.payout_status !== 'paid' && getDaysUntil(o.created_at) <= 0).length
    const soonCount    = orders.filter(o => o.status === 'delivered' && o.payout_status !== 'paid' && getDaysUntil(o.created_at) > 0 && getDaysUntil(o.created_at) <= 3).length

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {paying && <PayModal order={paying} onClose={() => setPaying(null)} onDone={handlePayDone} />}

            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 py-4 px-4">
                <div className="max-w-full">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h1 className="text-lg font-black uppercase italic tracking-tight dark:text-white">Journal des commandes</h1>
                            <p className="text-[10px] text-slate-400">
                                {orders.length} commande{orders.length > 1 ? 's' : ''}
                                {lateCount > 0 && <span className="text-red-500 font-bold"> · {lateCount} en retard 🔴</span>}
                                {soonCount > 0 && <span className="text-yellow-500 font-bold"> · {soonCount} bientôt 🟡</span>}
                            </p>
                        </div>
                        <div className="flex gap-2 items-center">
                            {newCount > 0 && (
                                <button onClick={() => load()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500 text-white text-xs font-bold animate-pulse">
                                    +{newCount} nouvelle{newCount > 1 ? 's' : ''} — Actualiser
                                </button>
                            )}
                            <button onClick={() => load()} disabled={loading} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                                <RefreshCw size={14} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-bold">
                                <Download size={13} /> Excel
                            </button>
                        </div>
                    </div>

                    {/* Filtres */}
                    <div className="flex gap-2 flex-wrap items-center">
                        {[
                            { key: 'today',     label: "Aujourd'hui" },
                            { key: 'yesterday', label: 'Hier' },
                            { key: 'week',      label: '7 jours' },
                            { key: 'month',     label: 'Ce mois' },
                        ].map(r => (
                            <button key={r.key} onClick={() => setQuick(r.key as any)}
                                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700 transition-colors">
                                {r.label}
                            </button>
                        ))}
                        <div className="flex gap-2 items-center ml-auto">
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400" />
                            <span className="text-slate-400 text-xs">→</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400" />
                            <button onClick={() => load()} className="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-bold">OK</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="px-4 py-3 grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 px-4 py-2.5">
                    <p className="text-[9px] font-black uppercase text-slate-400">CA période</p>
                    <p className="text-base font-black text-slate-900 dark:text-white">{fmt(totalCA)} <span className="text-xs">F</span></p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 px-4 py-2.5">
                    <p className="text-[9px] font-black uppercase text-slate-400">Commissions</p>
                    <p className="text-base font-black text-green-600">{fmt(totalCommis)} <span className="text-xs">F</span></p>
                </div>
                <div className={`rounded-xl border px-4 py-2.5 ${lateCount > 0 ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/30' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
                    <p className="text-[9px] font-black uppercase text-slate-400">Payouts dus</p>
                    <p className={`text-base font-black ${lateCount > 0 ? 'text-red-600' : 'text-amber-600'}`}>{fmt(totalPayouts)} <span className="text-xs">F</span></p>
                </div>
            </div>

            {/* Légende */}
            <div className="px-4 pb-2 flex gap-4 flex-wrap">
                <span className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-red-300 inline-block" /> En retard</span>
                <span className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-yellow-300 inline-block" /> Bientôt (1-3j)</span>
                <span className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-green-300 inline-block" /> Payé</span>
            </div>

            {/* Tableau */}
            <div className="px-4 pb-8">
                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-green-500" /></div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-sm font-bold text-slate-400">Aucune commande sur cette période</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs min-w-[1200px]">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-100 dark:border-slate-800 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                                        <th className="text-left px-3 py-2.5">Date · Heure</th>
                                        <th className="text-left px-3 py-2.5">Réf</th>
                                        <th className="text-left px-3 py-2.5">Vendeur</th>
                                        <th className="text-left px-3 py-2.5">Produit</th>
                                        <th className="text-left px-3 py-2.5">Client · Ville</th>
                                        <th className="text-right px-3 py-2.5">Montant</th>
                                        <th className="text-right px-3 py-2.5">Commission</th>
                                        <th className="text-right px-3 py-2.5">Payout dû</th>
                                        <th className="text-center px-3 py-2.5">Statut</th>
                                        <th className="text-center px-3 py-2.5">Paiement</th>
                                        <th className="text-center px-3 py-2.5">Échéance J+7</th>
                                        <th className="text-center px-3 py-2.5">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                                    {orders.map(order => {
                                        const st = STATUS[order.status] || { label: order.status, color: 'text-slate-500 bg-slate-50' }
                                        const vendor = (order.profiles as any)?.shop_name || (order.profiles as any)?.full_name || '—'
                                        const payout = order.vendor_payout || Math.round((order.total_amount || 0) * 0.9)
                                        const canPay = order.status === 'delivered' && order.payout_status !== 'paid'

                                        return (
                                            <tr key={order.id} className={`transition-colors hover:brightness-95 ${rowBg(order)}`}>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <p className="font-bold text-slate-900 dark:text-white">{order.created_at?.slice(0, 10)}</p>
                                                    <p className="text-slate-400">{order.created_at?.slice(11, 16)}</p>
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <p className="font-black text-slate-600 dark:text-slate-300 font-mono text-[10px]">{order.id?.slice(0, 8).toUpperCase()}</p>
                                                    {order.transaction_id && <p className="text-slate-400 text-[9px]">{order.transaction_id}</p>}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap max-w-[110px]">
                                                    <p className="font-bold text-slate-900 dark:text-white truncate">{vendor}</p>
                                                </td>
                                                <td className="px-3 py-2 max-w-[140px]">
                                                    <p className="text-slate-700 dark:text-slate-300 truncate">{order.items?.[0]?.name || '—'}</p>
                                                    {order.items?.length > 1 && <p className="text-[9px] text-slate-400">+{order.items.length - 1}</p>}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <p className="font-medium text-slate-700 dark:text-slate-300">{order.customer_name || '—'}</p>
                                                    <p className="text-[9px] text-slate-400">{order.customer_city || ''}</p>
                                                </td>
                                                <td className="px-3 py-2 text-right whitespace-nowrap font-black text-slate-900 dark:text-white">{fmt(order.total_amount || 0)}</td>
                                                <td className="px-3 py-2 text-right whitespace-nowrap font-bold text-green-600">{fmt(order.commission_amount || 0)}</td>
                                                <td className="px-3 py-2 text-right whitespace-nowrap font-bold text-amber-600">{fmt(payout)}</td>
                                                <td className="px-3 py-2 text-center whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${st.color}`}>{st.label}</span>
                                                </td>
                                                <td className="px-3 py-2 text-center whitespace-nowrap">
                                                    {order.received_sim ? (
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                                            order.received_sim === 'mtn' ? 'bg-yellow-100 text-yellow-700' :
                                                            order.received_sim === 'airtel' ? 'bg-red-100 text-red-600' :
                                                            'bg-slate-100 text-slate-500'
                                                        }`}>{order.received_sim.toUpperCase()}</span>
                                                    ) : <span className="text-slate-300">—</span>}
                                                </td>
                                                <td className="px-3 py-2 text-center whitespace-nowrap">
                                                    <EcheanceBadge order={order} />
                                                </td>
                                                <td className="px-3 py-2 text-center whitespace-nowrap">
                                                    {canPay ? (
                                                        <button onClick={() => setPaying(order)}
                                                            className="px-3 py-1 rounded-lg bg-green-500 hover:bg-green-600 text-white text-[10px] font-black transition-all">
                                                            💸 Payer
                                                        </button>
                                                    ) : order.payout_status === 'paid' ? (
                                                        <div className="text-center">
                                                            <span className="text-[9px] text-green-600 font-black">✓ {order.payout_reference || 'Payé'}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[9px] text-slate-300">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-t-2 border-slate-200 dark:border-slate-700">
                                        <td colSpan={5} className="px-3 py-2.5 text-[10px] font-black uppercase text-slate-500">Total — {orders.length} commandes</td>
                                        <td className="px-3 py-2.5 text-right font-black text-slate-900 dark:text-white">{fmt(totalCA)} F</td>
                                        <td className="px-3 py-2.5 text-right font-black text-green-600">{fmt(totalCommis)} F</td>
                                        <td className="px-3 py-2.5 text-right font-black text-amber-600">{fmt(totalPayouts)} F</td>
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
