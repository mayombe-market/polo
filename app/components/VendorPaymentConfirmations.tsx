'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Loader2, Clock, RefreshCw } from 'lucide-react'
import { getVendorPendingPayments, vendorConfirmPayment } from '@/app/actions/vendorPayment'
import { formatOrderNumber } from '@/lib/formatOrderNumber'

type Outcome = 'confirmed' | 'waiting_others' | 'rejected'

const OUTCOME_TEXT: Record<Outcome, string> = {
    confirmed: 'Commande confirmée. Le client a été prévenu. Retrouvez-la dans « Mes commandes » pour organiser la livraison.',
    waiting_others: 'Paiement confirmé. La commande sera confirmée dès que les autres vendeurs du panier auront validé.',
    rejected: 'Commande annulée. Le client a été prévenu que le paiement n\'a pas été reçu.',
}

export default function VendorPaymentConfirmations({
    hideWhenEmpty = false,
    onDecision,
}: { hideWhenEmpty?: boolean; onDecision?: () => void } = {}) {
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({})
    const [error, setError] = useState('')

    const fetchPending = async () => {
        setLoading(true)
        const res = await getVendorPendingPayments()
        setLoading(false)
        if ('error' in res) { setError(res.error); return }
        setOrders(res.orders)
        setOutcomes({})
    }

    useEffect(() => { fetchPending() }, [])

    const handleConfirm = async (order: any, confirmed: boolean) => {
        const amount = fmtAmount(order.amount)
        const question = confirmed
            ? `Confirmez-vous avoir reçu ${amount} avec le code ${order.transaction_id} ?\n\nLa commande sera confirmée et le client prévenu.`
            : `Confirmez-vous ne PAS avoir reçu ${amount} ?\n\nLa commande sera annulée et le client prévenu.`
        if (!window.confirm(question)) return

        setError('')
        setActionLoading(order.order_id + (confirmed ? '_yes' : '_no'))
        const res = await vendorConfirmPayment(order.order_id, confirmed)
        setActionLoading(null)
        if ('error' in res) { setError(res.error); return }
        setOutcomes(prev => ({ ...prev, [order.order_id]: res.outcome }))
        onDecision?.()
    }

    const fmtAmount = (n: number) => n.toLocaleString('fr-FR') + ' FCFA'
    const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

    if (loading) {
        if (hideWhenEmpty) return null
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-amber-500" />
            </div>
        )
    }

    if (orders.length === 0) {
        if (hideWhenEmpty) return null
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

    const pendingCount = orders.filter(o => !outcomes[o.order_id]).length

    return (
        <div className="space-y-3 mb-8 rounded-3xl border-2 border-amber-300 dark:border-amber-700/50 bg-amber-50/40 dark:bg-amber-900/10 p-4 md:p-5">
            <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                    {pendingCount} paiement{pendingCount > 1 ? 's' : ''} à vérifier
                </h4>
                <button onClick={fetchPending} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                    <RefreshCw size={11} /> Actualiser
                </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed px-1">
                Vérifiez sur votre téléphone que vous avez reçu le montant avec le code indiqué, puis répondez. Votre réponse est définitive.
            </p>

            {error && <p className="text-xs text-red-500 px-1">{error}</p>}

            {orders.map(order => {
                const outcome = outcomes[order.order_id]
                const alreadyConfirmed = order.vendor_confirmed && !outcome
                return (
                    <div
                        key={order.order_id}
                        className={`rounded-2xl border p-4 space-y-3 transition-all ${
                            outcome === 'rejected'
                                ? 'border-red-200 dark:border-red-800/30 bg-red-50/50 dark:bg-red-500/5'
                                : outcome
                                    ? 'border-green-200 dark:border-green-800/30 bg-green-50/50 dark:bg-green-500/5'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-xs font-black dark:text-white">
                                    {formatOrderNumber({ order_number: order.order_number ?? undefined, created_at: order.created_at })} · {order.customer_name}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(order.created_at)}</p>
                            </div>
                            {outcome === 'rejected' ? (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-[9px] font-black text-red-600 dark:text-red-400 flex-shrink-0">
                                    <XCircle size={9} /> Annulée
                                </span>
                            ) : outcome ? (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-[9px] font-black text-green-600 dark:text-green-400 flex-shrink-0">
                                    <CheckCircle size={9} /> {outcome === 'confirmed' ? 'Confirmée' : 'Payé'}
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-[9px] font-black text-amber-600 dark:text-amber-400 flex-shrink-0">
                                    <Clock size={9} /> À vérifier
                                </span>
                            )}
                        </div>

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

                        {outcome ? (
                            <p className={`text-xs font-bold leading-relaxed ${outcome === 'rejected' ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                                {OUTCOME_TEXT[outcome]}
                            </p>
                        ) : (
                            <>
                                {alreadyConfirmed && (
                                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                                        Vous aviez déjà indiqué avoir reçu ce paiement. Validez à nouveau pour confirmer la commande.
                                    </p>
                                )}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleConfirm(order, true)}
                                        disabled={!!actionLoading}
                                        className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                                    >
                                        {actionLoading === order.order_id + '_yes'
                                            ? <Loader2 size={13} className="animate-spin" />
                                            : <CheckCircle size={13} />
                                        }
                                        Paiement reçu
                                    </button>
                                    <button
                                        onClick={() => handleConfirm(order, false)}
                                        disabled={!!actionLoading}
                                        className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-black transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                                    >
                                        {actionLoading === order.order_id + '_no'
                                            ? <Loader2 size={13} className="animate-spin" />
                                            : <XCircle size={13} />
                                        }
                                        Paiement non reçu
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
