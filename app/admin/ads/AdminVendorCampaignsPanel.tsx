'use client'

import { useEffect, useState, useCallback } from 'react'
import {
    adminListVendorAdCampaigns,
    adminApproveVendorAdCampaign,
    adminRejectVendorAdCampaign,
} from '@/app/actions/vendorAdCampaigns'
import { formatAdminDateTime } from '@/lib/formatDateTime'
import { toast } from 'sonner'
import { Loader2, Check, X, Images } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { safeGetUser } from '@/lib/supabase-utils'
import {
    getAdminScopeFromProfileCity,
    canZoneAdminActOnVendor,
    vendorCityZoneCardClass,
    type AdminZoneScope,
} from '@/lib/adminZone'

export default function AdminVendorCampaignsPanel() {
    const [rows, setRows] = useState<any[]>([])
    const [loadError, setLoadError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<string | null>(null)
    const [rejectId, setRejectId] = useState<string | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [startInputs, setStartInputs] = useState<Record<string, string>>({})
    const [orderInputs, setOrderInputs] = useState<Record<string, string>>({})
    const [adminScope, setAdminScope] = useState<AdminZoneScope>('all')
    const [vendorCityBySellerId, setVendorCityBySellerId] = useState<Record<string, string | null>>({})

    const supabase = getSupabaseBrowserClient()

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            const { user } = await safeGetUser(supabase)
            if (!user || cancelled) return
            const { data: adminProfile } = await supabase
                .from('profiles')
                .select('city')
                .eq('id', user.id)
                .maybeSingle()
            if (cancelled) return
            setAdminScope(getAdminScopeFromProfileCity(adminProfile?.city))
        })()
        return () => {
            cancelled = true
        }
    }, [supabase])

    useEffect(() => {
        const ids = [...new Set(rows.map((r) => r.seller_id).filter(Boolean) as string[])]
        if (ids.length === 0) {
            setVendorCityBySellerId({})
            return
        }
        let cancelled = false
        ;(async () => {
            const { data } = await supabase.from('profiles').select('id, city').in('id', ids)
            if (cancelled) return
            const map: Record<string, string | null> = {}
            for (const row of data || []) {
                map[row.id] = row.city ?? null
            }
            setVendorCityBySellerId(map)
        })()
        return () => {
            cancelled = true
        }
    }, [rows, supabase])

    const canActOnCampaign = useCallback(
        (sellerId: string | undefined) => {
            if (!sellerId) return false
            return canZoneAdminActOnVendor(adminScope, vendorCityBySellerId[sellerId])
        },
        [adminScope, vendorCityBySellerId]
    )

    const load = async () => {
        setLoading(true)
        setLoadError(null)
        try {
            const res = await adminListVendorAdCampaigns()
            if ('ok' in res && res.ok) {
                setRows(res.campaigns || [])
                // Pré-remplir le champ "date de début" avec la date préférée du vendeur
                const prefilled: Record<string, string> = {}
                for (const c of res.campaigns || []) {
                    if (c.status === 'pending_review' && c.start_date) {
                        // Convertir ISO → format datetime-local (YYYY-MM-DDTHH:mm)
                        prefilled[c.id] = new Date(c.start_date).toISOString().slice(0, 16)
                    }
                }
                setStartInputs(prev => ({ ...prefilled, ...prev }))
            } else if ('error' in res) {
                setRows([])
                setLoadError(res.error)
                toast.error(res.error)
            } else {
                setRows(Array.isArray(res) ? res : [])
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Erreur chargement'
            setRows([])
            setLoadError(msg)
            toast.error(msg)
        } finally {
            setLoading(false)
        }
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
        <div className="w-full">
            <div className="flex items-center gap-2 mb-6">
                <Images size={24} className="text-orange-500" />
                <div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">
                        Campagnes vendeurs (Hero &amp; Tuile)
                    </h2>
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mt-1">
                        Paiement déclaré → validation → dates de diffusion
                    </p>
                    <p className="text-[9px] font-black uppercase text-slate-500 mt-2 tracking-widest">
                        {adminScope === 'all'
                            ? 'Super-admin — actions sur toutes les zones'
                            : `Zone admin : ${adminScope === 'brazzaville' ? 'Brazzaville' : 'Pointe-Noire'} — lecture seule hors zone (ville vendeur)`}
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
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-orange-500" size={32} />
                </div>
            ) : rows.length === 0 && !loadError ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 dark:border-slate-700 dark:bg-slate-900/50">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Aucune campagne pour l'instant</p>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                        Les vendeurs créent leurs campagnes sur{' '}
                        <code className="rounded bg-white px-1.5 py-0.5 text-xs dark:bg-slate-800">/vendor/ad-campaigns</code>
                        . Après paiement déclaré (<strong>pending_review</strong>), elles apparaissent ici.
                    </p>
                </div>
            ) : rows.length === 0 ? null : (
                <div className="space-y-6">
                    {rows.map((c) => {
                        const sellerCity = c.seller_id ? vendorCityBySellerId[c.seller_id] : undefined
                        const canAct = canActOnCampaign(c.seller_id as string | undefined)
                        return (
                        <div
                            key={c.id}
                            className={`rounded-2xl p-4 md:p-6 flex flex-col lg:flex-row gap-4 transition-all ${vendorCityZoneCardClass(sellerCity)}`}
                        >
                            <img
                                src={c.image_url || '/placeholder-image.svg'}
                                alt=""
                                className="w-full lg:w-48 h-36 object-cover rounded-xl shrink-0"
                            />
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    {!canAct && (
                                        <span
                                            className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                                            title="Actions réservées à l'admin de cette ville"
                                        >
                                            Lecture seule
                                        </span>
                                    )}
                                    {statusBadge(c.status)}
                                    <span className="text-[10px] font-bold uppercase text-slate-400">
                                        {c.placement === 'hero' ? 'Hero' : 'Tuile'} · {c.duration_days} j ·{' '}
                                        {c.price_fcfa != null ? `${Number(c.price_fcfa).toLocaleString('fr-FR')} FCFA` : '—'}
                                    </span>
                                </div>
                                <p className="font-black text-slate-900 dark:text-white">{c.title || 'Sans titre'}</p>
                                <p className="text-xs text-slate-500 break-all">{c.link_url}</p>
                                <p className="text-[10px] text-slate-400">
                                    Créée {c.created_at ? formatAdminDateTime(c.created_at) : '—'}
                                    {sellerCity != null && sellerCity.trim() !== '' ? (
                                        <span className="ml-2 font-bold text-slate-500 dark:text-slate-400">
                                            · Vendeur : {sellerCity.trim()}
                                        </span>
                                    ) : (
                                        <span className="ml-2 font-bold text-amber-600 dark:text-amber-400">
                                            · Ville vendeur non renseignée
                                        </span>
                                    )}
                                </p>
                                {c.payment_method && c.transaction_id ? (
                                    <p className="text-xs bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                                        <span className="font-bold text-slate-900 dark:text-white">
                                            {c.payment_method === 'mobile_money' ? 'MTN Mobile Money' : 'Airtel Money'} · ID:{' '}
                                            {String(c.transaction_id)}
                                        </span>
                                    </p>
                                ) : c.payment_note ? (
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
                                            <span>
                                                Début
                                                {c.start_date && (
                                                    <span className="text-orange-500 normal-case font-bold ml-1">
                                                        — date souhaitée par le vendeur
                                                    </span>
                                                )}
                                            </span>
                                            <input
                                                type="datetime-local"
                                                value={startInputs[c.id] ?? ''}
                                                onChange={(e) =>
                                                    setStartInputs((s) => ({ ...s, [c.id]: e.target.value }))
                                                }
                                                disabled={!canAct}
                                                title={!canAct ? "Actions réservées à l'admin de cette ville" : undefined}
                                                className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs bg-white dark:bg-slate-950 disabled:opacity-40"
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
                                                disabled={!canAct}
                                                title={!canAct ? "Actions réservées à l'admin de cette ville" : undefined}
                                                className="w-24 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs bg-white dark:bg-slate-950 disabled:opacity-40"
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            disabled={processing === c.id || !canAct}
                                            title={!canAct ? "Actions réservées à l'admin de cette ville" : undefined}
                                            onClick={() => approve(c.id)}
                                            className="inline-flex items-center justify-center gap-1 rounded-xl bg-green-600 text-white px-4 py-2 text-[10px] font-black uppercase self-end disabled:opacity-40"
                                        >
                                            {processing === c.id ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                                            Valider
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!canAct}
                                            title={!canAct ? "Actions réservées à l'admin de cette ville" : undefined}
                                            onClick={() => setRejectId(rejectId === c.id ? null : c.id)}
                                            className="inline-flex items-center justify-center gap-1 rounded-xl border border-red-200 text-red-600 px-4 py-2 text-[10px] font-black uppercase self-end disabled:opacity-40"
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
                                            disabled={!canAct}
                                            title={!canAct ? "Actions réservées à l'admin de cette ville" : undefined}
                                            className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm disabled:opacity-40"
                                        />
                                        <button
                                            type="button"
                                            disabled={processing === c.id || !canAct}
                                            title={!canAct ? "Actions réservées à l'admin de cette ville" : undefined}
                                            onClick={() => reject(c.id)}
                                            className="self-start rounded-xl bg-red-600 text-white px-4 py-2 text-[10px] font-black uppercase disabled:opacity-40"
                                        >
                                            {processing === c.id ? <Loader2 className="animate-spin" size={14} /> : null}
                                            Confirmer le refus
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
