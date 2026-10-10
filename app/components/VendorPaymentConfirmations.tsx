'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Loader2, Clock, RefreshCw } from 'lucide-react'
import { getVendorPendingPayments, vendorConfirmPayment } from '@/app/actions/vendorPayment'
import { formatOrderNumber } from '@/lib/formatOrderNumber'

export default function VendorPaymentConfirmations() {
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [error, setError] = useState('')

    const fetchPending = async () => {
        setLoading(true)
        const res = await getVendorPendingPayments()
        setLoading(false)
        if ('error' in res) { setError(res.error); return }
        setOrders(res.orders)
    }

    useEffect(() => { fetchPending() }, [])

    const handleConfirm = async (orderId: string, confirmed: boolean) => {
        setActionLoading(orderId + (confirmed ? '_yes' : '_no'))
        const res = await vendorConfirmPayment(orderId, confirmed)
        setActionLoading(null)
        if ('error' in res) { setError(res.error); return }
        setOrders(prev => prev.map(o =>
            o.order_id === orderId
                ? { ...o, vendor_confirmed: confirmed, disputed: !confirmed }
                : o
        ))
    }

    const fmtAmount = (n: number) => n.toLocaleString('fr-FR') + ' FCFA'
    const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-amber-500" />
            </div>
        )
    }

    if (orders.length === 0) {
        return (
            <div className="text-center py-10">
                <div className="text-3xl mb-3">💳</div>
                <p className="text-sm font-bold dark:text-white">Aucun paiement en attente</p>
                <p className="text-xs text-slate-400 mt-1">Les paiements MTN/Airtel de vos clients apparaîtront ici.</p>
                <button onClick={fetchPending} className="mt-4 flex items-center gap-1.5 mx-auto text-xs text-slate-400 hover:text-slate-600 transition-colors">
                    <RefreshCw size={12} /> Actualiser
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                    {orders.length} paiement{orders.length > 1 ? 's' : ''} à confirmer
                </h4>
                <button onClick={fetchPending} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                    <RefreshCw size={11} /> Actualiser
                </button>
            </div>

            {error && <p className="text-xs text-red-500 px-1">{error}</p>}

            {orders.map(order => (
                <div
                    key={order.order_id}
                    className={`rounded-2xl border p-4 space-y-3 transition-all ${
                        order.vendor_confirmed
                            ? 'border-green-200 dark:border-green-800/30 bg-green-50/50 dark:bg-green-500/5'
                            : order.disputed
                                ? 'border-red-200 dark:border-red-800/30 bg-red-50/50 dark:bg-red-500/5'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                >
                    {/* Header commande */}
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="text-xs font-black dark:text-white">
                                {formatOrderNumber(order.order_id)} · {order.customer_name}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(order.created_at)}</p>
                        </div>
                        {order.vendor_confirmed && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-[9px] font-black text-green-600 dark:text-green-400 flex-shrink-0">
                                <CheckCircle size={9} /> Confirmé
                            </span>
                        )}
                        {order.disputed && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-[9px] font-black text-red-600 dark:text-red-400 flex-shrink-0">
                                <XCircle size={9} /> Contesté
                            </span>
                        )}
                        {!order.vendor_confirmed && !order.disputed && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-[9px] font-black text-amber-600 dark:text-amber-400 flex-shrink-0">
                                <Clock size={9} /> En attente
                            </span>
                        )}
                    </div>

                    {/* Détails paiement */}
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 space-y-1.5">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Produits</span>
                            <span className="font-bold dark:text-white text-right max-w-[60%] truncate">{order.items}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Montant attendu</span>
                            <span className="font-black text-amber-600">{fmtAmount(order.amount)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Opérateur</span>
                            <span className={`font-bold ${order.method === 'mobile_money' ? 'text-yellow-600' : 'text-red-500'}`}>
                                {order.method === 'mobile_money' ? 'MTN MoMo' : 'Airtel Money'}
                            </span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Numéro reçu</span>
                            <span className="font-mono font-bold dark:text-white">{order.vendor_number}</span>
                        </div>
                        <div className="pt-1 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Référence saisie par le client</p>
                            <p className="font-mono text-base font-black tracking-[3px] text-slate-800 dark:text-white">{
                                order.transaction_id.replace(/(\d{3})(?=\d)/g, '$1 ')
                            }</p>
                        </div>
                    </div>

                    {/* Actions */}
                    {!order.vendor_confirmed && !order.disputed && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleConfirm(order.order_id, true)}
                                disabled={actionLoading === order.order_id + '_yes'}
                                className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
                            >
                                {actionLoading === order.order_id + '_yes'
                                    ? <Loader2 size={13} className="animate-spin" />
                                    : <CheckCircle size={13} />
                                }
                                Paiement reçu
                            </button>
                            <button
                                onClick={() => handleConfirm(order.order_id, false)}
                                disabled={actionLoading === order.order_id + '_no'}
                                className="flex-1 py-2.5 rounded-xl bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-black transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
                            >
                                {actionLoading === order.order_id + '_no'
                                    ? <Loader2 size={13} className="animate-spin" />
                                    : <XCircle size={13} />
                                }
                                Paiement non reçu
                            </button>
                        </div>
                    )}

                    {(order.vendor_confirmed || order.disputed) && (
                        <button
                            onClick={() => handleConfirm(order.order_id, !order.vendor_confirmed)}
                            className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            {order.vendor_confirmed ? 'Annuler la confirmation' : 'Marquer comme reçu finalement'}
                        </button>
                    )}
                </div>
            ))}
        </div>
    )
}
