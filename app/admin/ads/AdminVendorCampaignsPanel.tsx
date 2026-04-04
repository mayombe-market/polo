'use client'

import { useEffect, useState } from 'react'
import {
    adminListVendorAdCampaigns,
    adminApproveVendorAdCampaign,
    adminRejectVendorAdCampaign,
} from '@/app/actions/vendorAdCampaigns'
import { formatAdminDateTime } from '@/lib/formatDateTime'
import { toast } from 'sonner'
import { Loader2, Check, X, Images } from 'lucide-react'

export default function AdminVendorCampaignsPanel() {
    const [rows, setRows] = useState<any[]>([])
    const [loadError, setLoadError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<string | null>(null)
    const [rejectId, setRejectId] = useState<string | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [startInputs, setStartInputs] = useState<Record<string, string>>({})
    const [orderInputs, setOrderInputs] = useState<Record<string, string>>({})

    const load = async () => {
        setLoading(true)
        setLoadError(null)
        const res = await adminListVendorAdCampaigns()
        if (res.ok) {
            setRows(res.campaigns)
        } else {
            setRows([])
            setLoadError(res.error)
            toast.error(res.error)
        }
        setLoading(false)
    }

    useEffect(() => {
        load()
    }, [])

    const approve = async (id: string) => {
        setProcessing(id)
        const raw = startInputs[id]
        const startDateIso = raw ? new Date(raw).toISOString() : undefined
        const orderRaw = orderInputs[id]
        const displayOrder = orderRaw !== undefined && orderRaw !== '' ? parseInt(orderRaw, 10) : undefined
        const res = await adminApproveVendorAdCampaign(id, {
            startDateIso,
            displayOrder: Number.isFinite(displayOrder as number) ? displayOrder : undefined,
        })
        setProcessing(null)
        if (res.error) {
            toast.error(res.error)
            return
        }
        toast.success('Campagne activée')
        load()
    }

    const reject = async (id: string) => {
        if (!rejectReason.trim()) {
            toast.error('Motif obligatoire')
            return
        }
        setProcessing(id)
        const res = await adminRejectVendorAdCampaign(id, rejectReason.trim())
        setProcessing(null)
        if (res.error) {
            toast.error(res.error)
            return
        }
        toast.success('Campagne refusée')
        setRejectId(null)
        setRejectReason('')
        load()
    }

    const statusBadge = (s: string) => {
        const map: Record<string, string> = {
            pending_payment: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
            pending_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
            active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
            rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
            expired: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
            cancelled: 'bg-slate-100 text-slate-500',
        }
        return (
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${map[s] || 'bg-slate-100'}`}>
                {s}
            </span>
        )
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
                <Images size={24} className="text-orange-500" />
                <div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">
                        Campagnes vendeurs (Hero & Tuile)
                    </h2>
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mt-1">
                        Paiement déclaré → validation → dates de diffusion
                    </p>
                </div>
            </div>

            {loadError && (
                <div
                    role="alert"
                    className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
                >
                    <p className="font-black uppercase text-[10px] tracking-wide text-red-700 dark:text-red-300">
                        Impossible de charger les campagnes
                    </p>
                    <p className="mt-2 font-mono text-xs break-words">{loadError}</p>
                    <p className="mt-3 text-xs text-red-800/90 dark:text-red-200/90">
                        Vérifiez : table <code className="rounded bg-red-100 px-1 dark:bg-red-900/50">vendor_ad_campaigns</code>{' '}
                        créée dans Supabase, et les variables <code className="rounded bg-red-100 px-1 dark:bg-red-900/50">NEXT_PUBLIC_SUPABASE_*</code>{' '}
                        alignées avec ce projet.
                    </p>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-orange-500" size={32} />
                </div>
            ) : rows.length === 0 && !loadError ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 dark:border-slate-700 dark:bg-slate-900/50">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Aucune campagne pour l’instant</p>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                        Les vendeurs créent leurs campagnes sur{' '}
                        <code className="rounded bg-white px-1.5 py-0.5 text-xs dark:bg-slate-800">/vendor/ad-campaigns</code>
                        . Après paiement déclaré ( <strong>pending_review</strong> ), elles apparaissent ici pour validation.
                    </p>
                </div>
            ) : rows.length === 0 ? null : (
                <div className="space-y-6">
                    {rows.map((c) => (
                        <div
                            key={c.id}
                            className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-6 flex flex-col lg:flex-row gap-4"
                        >
                            <img
                                src={c.image_url || '/placeholder-image.svg'}
                                alt=""
                                className="w-full lg:w-48 h-36 object-cover rounded-xl shrink-0"
                            />
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    {statusBadge(c.status)}
                                    <span className="text-[10px] font-bold uppercase text-slate-400">
                                        {c.placement === 'hero' ? 'Hero' : 'Tuile'} · {c.duration_days} j ·{' '}
                                        {c.price_fcfa?.toLocaleString('fr-FR')} F
                                    </span>
                                </div>
                                <p className="font-black text-slate-900 dark:text-white">{c.title || 'Sans titre'}</p>
                                <p className="text-xs text-slate-500 break-all">{c.link_url}</p>
                                <p className="text-[10px] text-slate-400">
                                    Créée {c.created_at ? formatAdminDateTime(c.created_at) : '—'}
                                </p>
                                {c.payment_note ? (
                                    <p className="text-xs bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                                        Paiement : {c.payment_note}
                                    </p>
                                ) : null}
                                {c.status === 'active' && c.start_date && c.end_date ? (
                                    <p className="text-xs text-green-700 dark:text-green-300">
                                        Diffusion du {formatAdminDateTime(c.start_date)} au {formatAdminDateTime(c.end_date)}
                                    </p>
                                ) : null}
                                {c.status === 'rejected' && c.reject_reason ? (
                                    <p className="text-xs text-red-600">Refus : {c.reject_reason}</p>
                                ) : null}

                                {c.status === 'pending_review' && (
                                    <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 flex flex-col gap-1">
                                            Début (optionnel, défaut maintenant)
                                            <input
                                                type="datetime-local"
                                                value={startInputs[c.id] ?? ''}
                                                onChange={(e) =>
                                                    setStartInputs((s) => ({ ...s, [c.id]: e.target.value }))
                                                }
                                                className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs bg-white dark:bg-slate-950"
                                            />
                                        </label>
                                        <label className="text-[10px] font-black uppercase text-slate-400 flex flex-col gap-1">
                                            Ordre d&apos;affichage
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={orderInputs[c.id] ?? ''}
                                                onChange={(e) =>
                                                    setOrderInputs((s) => ({ ...s, [c.id]: e.target.value }))
                                                }
                                                className="w-24 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs bg-white dark:bg-slate-950"
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            disabled={processing === c.id}
                                            onClick={() => approve(c.id)}
                                            className="inline-flex items-center justify-center gap-1 rounded-xl bg-green-600 text-white px-4 py-2 text-[10px] font-black uppercase self-end"
                                        >
                                            {processing === c.id ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                                            Valider
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRejectId(rejectId === c.id ? null : c.id)}
                                            className="inline-flex items-center justify-center gap-1 rounded-xl border border-red-200 text-red-600 px-4 py-2 text-[10px] font-black uppercase self-end"
                                        >
                                            <X size={14} />
                                            Refuser
                                        </button>
                                    </div>
                                )}
                                {rejectId === c.id && c.status === 'pending_review' && (
                                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <textarea
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            placeholder="Motif du refus"
                                            rows={2}
                                            className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                                        />
                                        <button
                                            type="button"
                                            disabled={processing === c.id}
                                            onClick={() => reject(c.id)}
                                            className="self-start rounded-xl bg-red-600 text-white px-4 py-2 text-[10px] font-black uppercase"
                                        >
                                            {processing === c.id ? <Loader2 className="animate-spin" size={14} /> : null}
                                            Confirmer le refus
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
