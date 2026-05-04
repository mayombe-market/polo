'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminGetDisputes, adminAcceptDispute, adminRejectDispute } from '@/app/actions/disputes'
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Clock, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { formatAdminDateTime } from '@/lib/formatDateTime'

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    pending:  { label: 'En attente', color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20',  icon: <Clock size={11} /> },
    accepted: { label: 'Accepté',    color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20',  icon: <CheckCircle2 size={11} /> },
    rejected: { label: 'Rejeté',     color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20',      icon: <XCircle size={11} /> },
}

const FILTERS = [
    { key: 'all',      label: 'Tous' },
    { key: 'pending',  label: '⏳ En attente' },
    { key: 'accepted', label: '✅ Acceptés' },
    { key: 'rejected', label: '❌ Rejetés' },
]

export default function LitigesComptablePage() {
    const [disputes, setDisputes]   = useState<any[]>([])
    const [total, setTotal]         = useState(0)
    const [loading, setLoading]     = useState(true)
    const [filter, setFilter]       = useState('all')
    const [page, setPage]           = useState(0)
    const PER_PAGE = 20

    // Modal résolution
    const [resolving, setResolving] = useState<{ dispute: any; action: 'accept' | 'reject' } | null>(null)
    const [note, setNote]           = useState('')
    const [saving, setSaving]       = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        const res = await adminGetDisputes({ status: filter === 'all' ? undefined : filter, page, perPage: PER_PAGE })
        setDisputes(res.data || [])
        setTotal(res.total || 0)
        setLoading(false)
    }, [filter, page])

    useEffect(() => { load() }, [load])

    const pendingCount = filter === 'all' ? disputes.filter(d => d.status === 'pending').length : (filter === 'pending' ? total : 0)

    const openModal = (dispute: any, action: 'accept' | 'reject') => {
        setResolving({ dispute, action })
        setNote('')
    }

    const handleResolve = async () => {
        if (!resolving) return
        const { dispute, action } = resolving
        const buyerEmail = (dispute.buyer as any)?.email || ''
        const buyerName  = (dispute.buyer as any)?.full_name || (dispute.buyer as any)?.first_name || 'Client'

        setSaving(true)
        const res = action === 'accept'
            ? await adminAcceptDispute({ disputeId: dispute.id, note: note || undefined, buyerEmail, buyerName })
            : await adminRejectDispute({ disputeId: dispute.id, note: note || undefined, buyerEmail, buyerName })
        setSaving(false)

        if ('error' in res && res.error) {
            toast.error(res.error)
            return
        }

        toast.success(action === 'accept' ? 'Litige accepté — email envoyé au client ✓' : 'Litige rejeté — email envoyé au client ✓')
        setResolving(null)
        load()
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

            {/* Modal résolution */}
            {resolving && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="font-black text-slate-900 dark:text-white">
                                    {resolving.action === 'accept' ? '✅ Accepter le litige' : '❌ Rejeter le litige'}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Montant en jeu : <span className="font-black text-slate-700 dark:text-white">
                                        {fmt((resolving.dispute.orders as any)?.total_amount || 0)} F
                                    </span>
                                </p>
                            </div>
                            <button onClick={() => setResolving(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X size={15} />
                            </button>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 mb-4 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                            <p><span className="font-bold">Motif :</span> {resolving.dispute.motif}</p>
                            <p><span className="font-bold">Client :</span> {(resolving.dispute.buyer as any)?.full_name || (resolving.dispute.buyer as any)?.email || '—'}</p>
                            <p><span className="font-bold">Vendeur :</span> {(resolving.dispute.seller as any)?.shop_name || '—'}</p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">
                                Note au client (optionnel)
                            </label>
                            <textarea
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder={resolving.action === 'accept'
                                    ? 'Ex: Remboursement en cours de traitement...'
                                    : 'Ex: Litige non recevable car...'
                                }
                                rows={3}
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleResolve}
                                disabled={saving}
                                className={`flex-1 py-3 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50 ${
                                    resolving.action === 'accept'
                                        ? 'bg-green-500 hover:bg-green-600'
                                        : 'bg-red-500 hover:bg-red-600'
                                }`}
                            >
                                {saving ? <Loader2 size={15} className="animate-spin" /> : resolving.action === 'accept' ? `✅ Confirmer l'acceptation` : '❌ Confirmer le rejet'}
                            </button>
                            <button onClick={() => setResolving(null)} className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-500">
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 py-6 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-lg font-black uppercase italic tracking-tight dark:text-white">Litiges</h1>
                            <p className="text-[10px] text-slate-400">
                                {total} litige{total > 1 ? 's' : ''} au total
                                {pendingCount > 0 && <span className="ml-2 text-amber-500 font-bold">· {pendingCount} en attente</span>}
                            </p>
                        </div>
                        <button onClick={load} disabled={loading}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                            <RefreshCw size={14} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Filtres */}
                    <div className="flex gap-1.5 flex-wrap">
                        {FILTERS.map(f => (
                            <button key={f.key} onClick={() => { setFilter(f.key); setPage(0) }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    filter === f.key
                                        ? 'bg-green-500 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-green-500" />
                    </div>
                ) : disputes.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                        <AlertTriangle size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                        <p className="font-bold text-slate-400">Aucun litige{filter !== 'all' ? ' dans cette catégorie' : ''}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {disputes.map(d => {
                            const st = STATUS_CONFIG[d.status] || STATUS_CONFIG.pending
                            const order = d.orders as any
                            const buyer = d.buyer as any
                            const seller = d.seller as any
                            const isPending = d.status === 'pending'

                            return (
                                <div key={d.id} className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 ${
                                    isPending ? 'border-amber-200 dark:border-amber-800/40' : 'border-slate-100 dark:border-slate-800'
                                }`}>
                                    <div className="flex items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            {/* Status + motif */}
                                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                                <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>
                                                    {st.icon} {st.label}
                                                </span>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{d.motif}</span>
                                                <span className="text-[10px] text-slate-400">{formatAdminDateTime(d.created_at)}</span>
                                            </div>

                                            {/* Infos financières */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                                                    <p className="text-[9px] font-black uppercase text-slate-400">Montant</p>
                                                    <p className="text-sm font-black text-slate-900 dark:text-white">{fmt(order?.total_amount || 0)} F</p>
                                                </div>
                                                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                                                    <p className="text-[9px] font-black uppercase text-slate-400">Client</p>
                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                                                        {buyer?.full_name || buyer?.first_name || buyer?.email || '—'}
                                                    </p>
                                                </div>
                                                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                                                    <p className="text-[9px] font-black uppercase text-slate-400">Vendeur</p>
                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                                                        {seller?.shop_name || seller?.full_name || '—'}
                                                    </p>
                                                </div>
                                                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                                                    <p className="text-[9px] font-black uppercase text-slate-400">Ville</p>
                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{order?.customer_city || '—'}</p>
                                                </div>
                                            </div>

                                            {/* Description */}
                                            {d.description && (
                                                <p className="text-[11px] text-slate-500 italic mb-2 line-clamp-2">"{d.description}"</p>
                                            )}

                                            {/* Note admin si résolu */}
                                            {d.admin_note && (
                                                <p className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 py-1.5">
                                                    💬 Note : {d.admin_note}
                                                </p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {isPending && (
                                            <div className="flex flex-col gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => openModal(d, 'accept')}
                                                    className="px-3 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-[10px] font-black flex items-center gap-1.5"
                                                >
                                                    <CheckCircle2 size={11} /> Accepter
                                                </button>
                                                <button
                                                    onClick={() => openModal(d, 'reject')}
                                                    className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-600 dark:text-red-400 text-[10px] font-black flex items-center gap-1.5 border border-red-200 dark:border-red-800/40"
                                                >
                                                    <XCircle size={11} /> Rejeter
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}

                        {/* Pagination */}
                        {total > PER_PAGE && (
                            <div className="flex items-center justify-center gap-3 pt-2">
                                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">
                                    <ChevronLeft size={15} />
                                </button>
                                <span className="text-sm font-bold text-slate-500">Page {page + 1}</span>
                                <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PER_PAGE >= total}
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
