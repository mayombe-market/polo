'use client'

import { useEffect, useState, useCallback } from 'react'
import { getPendingPayouts, getPaidPayouts, markPayoutPaid, saveVendorPayoutPhone } from '@/app/actions/comptable'
import { Loader2, Send, CheckCircle, Clock, AlertTriangle, Phone, X, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { formatAdminDateTime } from '@/lib/formatDateTime'

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

function daysSince(dateStr: string) {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export default function PayoutsPage() {
    const [tab, setTab] = useState<'pending' | 'done'>('pending')
    const [pending, setPending] = useState<any[]>([])
    const [paid, setPaid] = useState<any[]>([])
    const [paidTotal, setPaidTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [paidPage, setPaidPage] = useState(0)

    // Modal paiement
    const [paying, setPaying] = useState<any | null>(null)
    const [phone, setPhone] = useState('')
    const [reference, setReference] = useState('')
    const [note, setNote] = useState('')
    const [saving, setSaving] = useState(false)

    const loadPending = useCallback(async () => {
        const res = await getPendingPayouts()
        setPending(res.data || [])
    }, [])

    const loadPaid = useCallback(async () => {
        const res = await getPaidPayouts({ page: paidPage })
        setPaid(res.data || [])
        setPaidTotal(res.total || 0)
    }, [paidPage])

    useEffect(() => {
        setLoading(true)
        Promise.all([loadPending(), loadPaid()]).finally(() => setLoading(false))
    }, [loadPending, loadPaid])

    const openPayModal = (order: any) => {
        setPaying(order)
        // Pré-remplir avec numéro du vendeur si disponible
        const vendorPhone = (order.profiles as any)?.payout_phone || (order.profiles as any)?.phone || ''
        setPhone(vendorPhone)
        setReference('')
        setNote('')
    }

    const handlePay = async () => {
        if (!phone.trim() || !reference.trim()) {
            toast.error('Numéro MoMo et référence obligatoires')
            return
        }
        setSaving(true)
        // Sauvegarder le numéro MoMo du vendeur pour la prochaine fois
        const vendorId = (paying.profiles as any)?.id
        if (vendorId && phone !== (paying.profiles as any)?.payout_phone) {
            await saveVendorPayoutPhone(vendorId, phone)
        }

        const res = await markPayoutPaid({ orderId: paying.id, reference, phone, note })
        setSaving(false)

        if (res.success) {
            toast.success('Payout enregistré ✓')
            setPaying(null)
            setPending(prev => prev.filter(p => p.id !== paying.id))
            loadPaid()
        } else {
            toast.error(res.error || 'Erreur')
        }
    }

    const totalPending = pending.reduce((s, o) => s + (o.vendor_payout || Math.round((o.total_amount || 0) * 0.9)), 0)

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Modal paiement */}
            {paying && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <p className="font-black text-slate-900 dark:text-white">Payer {(paying.profiles as any)?.shop_name || 'Vendeur'}</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Montant dû : <span className="font-black text-green-600 text-sm">{fmt(paying.vendor_payout || Math.round((paying.total_amount || 0) * 0.9))} F</span>
                                </p>
                            </div>
                            <button onClick={() => setPaying(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">
                                    Numéro MoMo du vendeur <span className="text-red-400">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <Phone size={14} className="text-slate-400 mt-3 flex-shrink-0" />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        placeholder="06 XXX XX XX"
                                        className="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-400 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">
                                    Référence transaction MoMo <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={reference}
                                    onChange={e => setReference(e.target.value)}
                                    placeholder="Ex: CI241023ABCD"
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-400 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Note (optionnel)</label>
                                <input
                                    type="text"
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    placeholder="Ex: paiement semaine 17"
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-400 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-5">
                            <button
                                onClick={handlePay}
                                disabled={saving}
                                className="flex-1 py-3.5 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <><Send size={15} /> Confirmer le paiement</>}
                            </button>
                            <button onClick={() => setPaying(null)} className="px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 py-6 px-4">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-lg font-black uppercase italic tracking-tight dark:text-white">Payouts vendeurs</h1>
                            <p className="text-[10px] text-slate-400">
                                {pending.length} en attente · {fmt(totalPending)} F à verser
                            </p>
                        </div>
                        <button onClick={() => { setLoading(true); Promise.all([loadPending(), loadPaid()]).finally(() => setLoading(false)) }}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                            <RefreshCw size={14} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="flex gap-1.5">
                        {[
                            { id: 'pending', label: `⏳ En attente (${pending.length})` },
                            { id: 'done',    label: `✅ Effectués (${paidTotal})` },
                        ].map(t => (
                            <button key={t.id} onClick={() => setTab(t.id as any)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                    tab === t.id ? 'bg-green-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-green-500" /></div>
                ) : tab === 'pending' ? (
                    pending.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <CheckCircle size={40} className="mx-auto text-green-300 mb-3" />
                            <p className="font-bold text-slate-400">Aucun payout en attente 🎉</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pending.map(order => {
                                const amount = order.vendor_payout || Math.round((order.total_amount || 0) * 0.9)
                                const days = daysSince(order.created_at)
                                const isLate = days >= 7
                                return (
                                    <div key={order.id} className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 flex items-center gap-4 ${isLate ? 'border-red-200 dark:border-red-800/50' : 'border-slate-100 dark:border-slate-800'}`}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {(order.profiles as any)?.shop_name || (order.profiles as any)?.full_name || 'Vendeur'}
                                                </p>
                                                {isLate && (
                                                    <span className="flex items-center gap-1 text-[9px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                                                        <AlertTriangle size={9} /> {days}j de retard
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                {order.items?.[0]?.name || 'Commande'} · livré {formatAdminDateTime(order.created_at)}
                                            </p>
                                            {(order.profiles as any)?.payout_phone && (
                                                <p className="text-[10px] text-green-500 mt-0.5">
                                                    📱 {(order.profiles as any).payout_phone}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-lg font-black text-slate-900 dark:text-white">{fmt(amount)} F</p>
                                            <p className="text-[10px] text-slate-400">Commission: {fmt(order.commission_amount || 0)} F</p>
                                        </div>
                                        <button
                                            onClick={() => openPayModal(order)}
                                            className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-black transition-all"
                                        >
                                            Payer
                                        </button>
                                    </div>
                                )
                            })}

                            {/* Total */}
                            <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200/60 dark:border-green-800/40 flex justify-between items-center">
                                <span className="text-xs font-black uppercase text-green-700 dark:text-green-400">Total à verser</span>
                                <span className="text-xl font-black text-green-700 dark:text-green-400">{fmt(totalPending)} F</span>
                            </div>
                        </div>
                    )
                ) : (
                    // Tab payé
                    <div className="space-y-3">
                        {paid.length === 0 ? (
                            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <p className="text-sm font-bold text-slate-400">Aucun payout enregistré</p>
                            </div>
                        ) : (
                            paid.map(order => (
                                <div key={order.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-4">
                                    <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                                            {(order.profiles as any)?.shop_name || 'Vendeur'}
                                        </p>
                                        <p className="text-[11px] text-slate-400">
                                            {order.payout_phone || '—'} · Réf: {order.payout_reference || '—'}
                                        </p>
                                        <p className="text-[10px] text-slate-300">{formatAdminDateTime(order.payout_date)}</p>
                                    </div>
                                    <p className="text-sm font-black text-green-600">{fmt(order.vendor_payout || 0)} F</p>
                                </div>
                            ))
                        )}
                        {paidTotal > 30 && (
                            <div className="flex items-center justify-center gap-3 mt-4">
                                <button onClick={() => setPaidPage(p => Math.max(0, p - 1))} disabled={paidPage === 0}
                                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">
                                    <ChevronLeft size={15} />
                                </button>
                                <span className="text-sm font-bold text-slate-500">Page {paidPage + 1}</span>
                                <button onClick={() => setPaidPage(p => p + 1)} disabled={(paidPage + 1) * 30 >= paidTotal}
                                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">
                                    <ChevronRight size={15} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
