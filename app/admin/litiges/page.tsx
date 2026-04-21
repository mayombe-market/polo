'use client'

import { useState, useEffect, useCallback } from 'react'
import { Toaster, toast } from 'sonner'
import {
    adminGetDisputes,
    adminAcceptDispute,
    adminRejectDispute,
} from '@/app/actions/disputes'
import {
    AlertTriangle, CheckCircle2, XCircle, Clock, Loader2,
    ChevronLeft, ChevronRight, Eye, X, User, ShoppingBag,
    MessageSquare, Image as ImageIcon, RefreshCw
} from 'lucide-react'

// ─── Badge statut ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; cls: string }> = {
        pending:  { label: 'En attente', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
        accepted: { label: 'Accepté',    cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
        rejected: { label: 'Refusé',     cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
        resolved: { label: 'Résolu',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    }
    const s = map[status] || map.pending
    return (
        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${s.cls}`}>
            {s.label}
        </span>
    )
}

// ─── Modal détail / action ──────────────────────────────────────────────────────
function DisputeModal({
    dispute,
    onClose,
    onRefresh,
}: {
    dispute: any
    onClose: () => void
    onRefresh: () => void
}) {
    const [note, setNote] = useState('')
    const [saving, setSaving] = useState(false)
    const [lightbox, setLightbox] = useState<string | null>(null)

    const buyer = dispute.buyer
    const order = dispute.orders

    const buyerEmail = buyer?.email || ''
    const buyerName  = buyer?.full_name || buyer?.first_name
        ? `${buyer?.first_name || ''} ${buyer?.last_name || ''}`.trim()
        : 'Client'

    async function handle(action: 'accept' | 'reject') {
        setSaving(true)
        const fn = action === 'accept' ? adminAcceptDispute : adminRejectDispute
        const res = await fn({ disputeId: dispute.id, note, buyerEmail, buyerName })
        setSaving(false)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(action === 'accept' ? 'Litige accepté — email envoyé ✅' : 'Litige refusé — email envoyé')
            onRefresh()
            onClose()
        }
    }

    const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
                <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>

                    {/* Header */}
                    <div className="flex justify-between items-start p-6 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                        <div>
                            <h2 className="text-lg font-black uppercase italic dark:text-white">Réclamation</h2>
                            <StatusBadge status={dispute.status} />
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            <X size={14} />
                        </button>
                    </div>

                    <div className="p-6 space-y-5">

                        {/* Commande */}
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-1.5">
                                <ShoppingBag size={11} /> Commande
                            </p>
                            <p className="text-sm font-black dark:text-white">{fmt(order?.total_amount || 0)} FCFA</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                                {order?.customer_name} — {order?.customer_city} — {new Date(dispute.created_at).toLocaleDateString('fr-FR')}
                            </p>
                            {order?.items && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {order.items.map((item: any, i: number) => (
                                        <span key={i} className="text-[10px] bg-white dark:bg-slate-700 px-2 py-1 rounded-lg font-bold dark:text-white">
                                            {item.name} ×{item.quantity}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Acheteur */}
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-1.5">
                                <User size={11} /> Acheteur
                            </p>
                            <p className="text-sm font-black dark:text-white">{buyerName}</p>
                            <p className="text-[10px] text-slate-400">{buyerEmail}</p>
                            {buyer?.phone && <p className="text-[10px] text-slate-400">{buyer.phone}</p>}
                        </div>

                        {/* Vendeur */}
                        {dispute.seller && (
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Vendeur</p>
                                <p className="text-sm font-black dark:text-white">{dispute.seller.shop_name || dispute.seller.full_name}</p>
                                <p className="text-[10px] text-slate-400">{dispute.seller.email}</p>
                            </div>
                        )}

                        {/* Motif */}
                        <div>
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Motif</p>
                            <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{dispute.motif}</p>
                        </div>

                        {/* Description */}
                        {dispute.description && (
                            <div>
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center gap-1.5">
                                    <MessageSquare size={11} /> Description
                                </p>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
                                    {dispute.description}
                                </p>
                            </div>
                        )}

                        {/* Images */}
                        {dispute.images && dispute.images.length > 0 && (
                            <div>
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-1.5">
                                    <ImageIcon size={11} /> Photos ({dispute.images.length})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {dispute.images.map((url: string, i: number) => (
                                        <button key={i} type="button" onClick={() => setLightbox(url)}>
                                            <img src={url} alt="" className="w-20 h-20 rounded-xl object-cover hover:opacity-80 transition-opacity cursor-zoom-in" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Note admin existante */}
                        {dispute.admin_note && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-4">
                                <p className="text-[9px] font-black uppercase text-blue-500 tracking-widest mb-1">Note équipe</p>
                                <p className="text-sm text-blue-700 dark:text-blue-300">{dispute.admin_note}</p>
                            </div>
                        )}

                        {/* Actions (seulement si pending) */}
                        {dispute.status === 'pending' && (
                            <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-2">
                                        Message pour le client (optionnel)
                                    </label>
                                    <textarea
                                        value={note}
                                        onChange={e => setNote(e.target.value)}
                                        rows={3}
                                        placeholder="Ex : Votre réclamation a été validée, nous vous recontactons sous 24h..."
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm placeholder-slate-400 dark:text-white focus:outline-none focus:border-orange-400 resize-none"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handle('accept')}
                                        disabled={saving}
                                        className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white py-3.5 rounded-2xl font-black uppercase italic text-[10px] flex items-center justify-center gap-2 transition-all"
                                    >
                                        {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                        Accepter
                                    </button>
                                    <button
                                        onClick={() => handle('reject')}
                                        disabled={saving}
                                        className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3.5 rounded-2xl font-black uppercase italic text-[10px] flex items-center justify-center gap-2 transition-all"
                                    >
                                        {saving ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                        Refuser
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Lightbox */}
            {lightbox && (
                <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
                    <img src={lightbox} alt="" className="max-w-full max-h-full rounded-2xl" />
                    <button className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30">
                        <X size={18} />
                    </button>
                </div>
            )}
        </>
    )
}

// ─── Page principale ────────────────────────────────────────────────────────────
const TABS = [
    { id: 'all',      label: 'Tous',         icon: AlertTriangle },
    { id: 'pending',  label: 'En attente',   icon: Clock },
    { id: 'accepted', label: 'Acceptés',     icon: CheckCircle2 },
    { id: 'rejected', label: 'Refusés',      icon: XCircle },
]

const PER_PAGE = 20

export default function AdminLitigesPage() {
    const [tab, setTab] = useState('pending')
    const [disputes, setDisputes] = useState<any[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState<any>(null)

    const load = useCallback(async () => {
        setLoading(true)
        const res = await adminGetDisputes({ status: tab, page, perPage: PER_PAGE })
        setDisputes(res.data)
        setTotal(res.total)
        setLoading(false)
    }, [tab, page])

    useEffect(() => { load() }, [load])

    // reset page when tab changes
    useEffect(() => { setPage(0) }, [tab])

    const totalPages = Math.ceil(total / PER_PAGE)

    const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

    return (
        <>
            <Toaster position="top-right" richColors closeButton />

            <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
                <div className="max-w-7xl mx-auto px-4 py-8">

                    {/* Titre */}
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white flex items-center gap-2">
                                <AlertTriangle size={20} className="text-orange-500" />
                                Litiges
                            </h1>
                            <p className="text-[10px] font-black uppercase text-slate-400 mt-0.5">{total} réclamation{total > 1 ? 's' : ''} au total</p>
                        </div>
                        <button onClick={load} className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 transition-colors" title="Actualiser">
                            <RefreshCw size={14} className={loading ? 'animate-spin text-orange-500' : 'text-slate-500'} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mb-6 bg-white dark:bg-slate-900 rounded-2xl p-1.5 border border-slate-100 dark:border-slate-800 w-fit">
                        {TABS.map(t => {
                            const Icon = t.icon
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setTab(t.id)}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${tab === t.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                >
                                    <Icon size={11} />
                                    {t.label}
                                </button>
                            )
                        })}
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="flex items-center justify-center py-24">
                            <Loader2 size={28} className="animate-spin text-orange-500" />
                        </div>
                    ) : disputes.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 py-20 text-center">
                            <AlertTriangle size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                            <p className="text-sm font-black uppercase italic text-slate-400">Aucune réclamation</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-800">
                                            <th className="text-left px-5 py-3.5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Date</th>
                                            <th className="text-left px-5 py-3.5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Client</th>
                                            <th className="text-left px-5 py-3.5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Motif</th>
                                            <th className="text-right px-5 py-3.5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Montant</th>
                                            <th className="text-center px-5 py-3.5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Statut</th>
                                            <th className="text-center px-5 py-3.5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Photos</th>
                                            <th className="text-center px-5 py-3.5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {disputes.map(d => {
                                            const buyer = d.buyer
                                            const order = d.orders
                                            const buyerName = buyer?.full_name
                                                || (buyer?.first_name ? `${buyer.first_name} ${buyer.last_name || ''}`.trim() : 'Client')
                                            return (
                                                <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-5 py-4">
                                                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                                            {new Date(d.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <p className="text-[12px] font-black dark:text-white">{buyerName}</p>
                                                        <p className="text-[10px] text-slate-400">{order?.customer_city || '—'}</p>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <p className="text-[11px] font-bold text-orange-600 dark:text-orange-400 max-w-[180px] leading-snug">{d.motif}</p>
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        <span className="text-[12px] font-black dark:text-white">{fmt(order?.total_amount || 0)} F</span>
                                                    </td>
                                                    <td className="px-5 py-4 text-center">
                                                        <StatusBadge status={d.status} />
                                                    </td>
                                                    <td className="px-5 py-4 text-center">
                                                        {d.images && d.images.length > 0 ? (
                                                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">
                                                                📷 {d.images.length}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-300 dark:text-slate-600">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4 text-center">
                                                        <button
                                                            onClick={() => setSelected(d)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-500 rounded-xl text-[10px] font-black uppercase transition-colors"
                                                        >
                                                            <Eye size={11} />
                                                            Voir
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-black uppercase text-slate-400">
                                        Page {page + 1} / {totalPages}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPage(p => Math.max(0, p - 1))}
                                            disabled={page === 0}
                                            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 disabled:opacity-30 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            <ChevronLeft size={14} />
                                        </button>
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                            disabled={page >= totalPages - 1}
                                            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 disabled:opacity-30 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal détail */}
            {selected && (
                <DisputeModal
                    dispute={selected}
                    onClose={() => setSelected(null)}
                    onRefresh={load}
                />
            )}
        </>
    )
}
