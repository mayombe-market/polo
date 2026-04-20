'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, Check, X, Loader2, Clock, Eye, ChevronDown, ChevronUp, User, Phone, MapPin, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { safeGetUser } from '@/lib/supabase-utils'
import { useRealtime } from '@/hooks/useRealtime'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
    adminGetPendingVerifications,
    adminGetAllVerifications,
    adminApproveVerification,
    adminRejectVerification,
} from '@/app/actions/verifications'
import { formatAdminDateTime } from '@/lib/formatDateTime'

const supabase = getSupabaseBrowserClient()


export default function AdminVerificationsPage() {
    const [tab, setTab] = useState<'pending' | 'all'>('pending')
    const [verifications, setVerifications] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<string | null>(null)
    const [rejectingId, setRejectingId] = useState<string | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [zoomImage, setZoomImage] = useState<string | null>(null)

    const fetchVerifications = async () => {
        setLoading(true)
        const result = tab === 'pending'
            ? await adminGetPendingVerifications()
            : await adminGetAllVerifications()
        setVerifications(result.verifications || [])
        setLoading(false)
    }

    useEffect(() => {
        fetchVerifications()
    }, [tab])

    // Realtime via shared channel
    useRealtime('verification:insert', (payload) => {
        if (tab === 'pending') fetchVerifications()
        const row = payload?.new ?? payload
        const when = row?.created_at
            ? formatAdminDateTime(row.created_at)
            : formatAdminDateTime(new Date())
        toast.info('Nouvelle demande de vérification !', {
            description: `Reçue le ${when}`,
        })
    }, [tab])

    const handleApprove = async (id: string) => {
        setProcessing(id)
        const result = await adminApproveVerification(id)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Vendeur approuvé !')
            fetchVerifications()
        }
        setProcessing(null)
    }

    const handleReject = async (id: string) => {
        if (!rejectReason.trim()) {
            toast.error('Le motif de refus est obligatoire')
            return
        }
        setProcessing(id)
        const result = await adminRejectVerification(id, rejectReason)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Vendeur refusé')
            setRejectingId(null)
            setRejectReason('')
            fetchVerifications()
        }
        setProcessing(null)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600">En attente</span>
            case 'approved': return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-100 dark:bg-green-900/20 text-green-600">Approuvé</span>
            case 'rejected': return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 dark:bg-red-900/20 text-red-600">Refusé</span>
            default: return null
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white flex items-center gap-2">
                            <ShieldCheck size={24} className="text-orange-500" />
                            Vérifications vendeurs
                        </h1>
                        <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mt-1">
                            Examiner les demandes d&apos;identité
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {(['pending', 'all'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                                tab === t
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                            }`}
                        >
                            {t === 'pending' ? 'En attente' : 'Historique'}
                        </button>
                    ))}
                </div>

                {/* Loading */}
                {loading && (
                    <div className="text-center py-16">
                        <Loader2 size={24} className="animate-spin mx-auto text-orange-500" />
                    </div>
                )}

                {/* Empty */}
                {!loading && verifications.length === 0 && (
                    <div className="text-center py-16 text-slate-400">
                        <ShieldCheck size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-bold">
                            {tab === 'pending' ? 'Aucune demande en attente' : 'Aucun historique'}
                        </p>
                    </div>
                )}

                {/* Liste */}
                {!loading && verifications.map((v) => {
                    const vendor = v.vendor
                    const isExpanded = expandedId === v.id

                    return (
                        <div key={v.id} className="mb-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                            {/* Header card */}
                            <button
                                onClick={() => setExpandedId(isExpanded ? null : v.id)}
                                className="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm">
                                    {vendor?.avatar_url ? (
                                        <img src={vendor.avatar_url} alt="" width={40} height={40} className="object-cover" loading="lazy" decoding="async" />
                                    ) : (
                                        (vendor?.first_name?.[0] || '?')
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold dark:text-white truncate">
                                        {vendor?.first_name} {vendor?.last_name}
                                    </p>
                                    <p className="text-[10px] text-slate-400 truncate">
                                        {vendor?.shop_name || vendor?.store_name} — {vendor?.city || 'Ville non renseignée'}
                                    </p>
                                </div>

                                {getStatusBadge(v.status)}

                                <div className="text-[10px] text-slate-400 flex-shrink-0 text-right leading-tight">
                                    <span className="block font-semibold text-slate-500 dark:text-slate-300">
                                        {formatAdminDateTime(v.created_at)}
                                    </span>
                                </div>

                                {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                            </button>

                            {/* Détails expandés */}
                            {isExpanded && (
                                <div className="px-4 pb-4 space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                        <Clock size={12} className="text-orange-500" />
                                        Demande reçue le {formatAdminDateTime(v.created_at)}
                                    </p>
                                    {/* Infos vendeur */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                        <div className="flex items-center gap-1 text-slate-400">
                                            <User size={12} /> {vendor?.first_name} {vendor?.last_name}
                                        </div>
                                        <div className="flex items-center gap-1 text-slate-400">
                                            <Mail size={12} /> {vendor?.email}
                                        </div>
                                        <div className="flex items-center gap-1 text-slate-400">
                                            <Phone size={12} /> {vendor?.phone || 'N/A'}
                                        </div>
                                        <div className="flex items-center gap-1 text-slate-400">
                                            <MapPin size={12} /> {vendor?.city || 'N/A'}
                                        </div>
                                    </div>

                                    {/* Photos */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1.5">Photo boutique</p>
                                            <div
                                                className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90 transition-opacity"
                                                onClick={() => setZoomImage(v.shop_photo_url)}
                                            >
                                                <img src={v.shop_photo_url} alt="Boutique" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors">
                                                    <Eye size={20} className="text-white opacity-0 hover:opacity-100" />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1.5">
                                                {v.id_type === 'passport' ? '📗 Passeport' : '🪪 CNI'}
                                            </p>
                                            {(v.id_type === 'passport' ? v.passport_photo_url : v.cni_photo_url) ? (
                                                <div
                                                    className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() => setZoomImage(v.id_type === 'passport' ? v.passport_photo_url : v.cni_photo_url)}
                                                >
                                                    <img
                                                        src={v.id_type === 'passport' ? v.passport_photo_url : v.cni_photo_url}
                                                        alt="Pièce d'identité"
                                                        className="absolute inset-0 h-full w-full object-cover"
                                                        loading="lazy"
                                                        decoding="async"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-full aspect-video rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 text-xs">
                                                    Non fournie
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Comparaison noms */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-3">Comparaison des noms</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] text-slate-400">
                                                    Nom sur {v.id_type === 'passport' ? 'le passeport' : 'la CNI'}
                                                </p>
                                                <p className="text-sm font-bold dark:text-white">{v.cni_name}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400">Nom Mobile Money</p>
                                                <p className="text-sm font-bold dark:text-white">{v.momo_name}</p>
                                            </div>
                                        </div>
                                        {v.cni_name.trim().toLowerCase() === v.momo_name.trim().toLowerCase() ? (
                                            <div className="mt-2 flex items-center gap-1 text-green-500 text-xs font-bold">
                                                <Check size={14} /> Les noms correspondent
                                            </div>
                                        ) : (
                                            <div className="mt-2 flex items-center gap-1 text-amber-500 text-xs font-bold">
                                                ⚠️ Les noms ne correspondent pas exactement
                                            </div>
                                        )}

                                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                            <p className="text-[10px] text-slate-400">Mobile Money</p>
                                            <p className="text-sm font-bold dark:text-white">
                                                {v.momo_operator === 'MTN' ? '🟡' : '🔴'} {v.momo_operator} — +242 {v.momo_number}
                                            </p>
                                        </div>

                                        {v.niu_number && (
                                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                                <p className="text-[10px] text-slate-400">NIU / RCCM</p>
                                                <p className="text-sm font-bold dark:text-white font-mono">
                                                    🏢 {v.niu_number}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Motif de rejet si applicable */}
                                    {v.status === 'rejected' && v.rejection_reason && (
                                        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
                                            <p className="text-xs font-bold text-red-600">Motif de refus :</p>
                                            <p className="text-xs text-red-500">{v.rejection_reason}</p>
                                        </div>
                                    )}

                                    {/* Actions (seulement pour pending) */}
                                    {v.status === 'pending' && (
                                        <div className="flex gap-3">
                                            {rejectingId === v.id ? (
                                                <div className="flex-1 space-y-2">
                                                    <input
                                                        type="text"
                                                        value={rejectReason}
                                                        onChange={(e) => setRejectReason(e.target.value)}
                                                        placeholder="Motif du refus (obligatoire)..."
                                                        className="w-full px-4 py-2 rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-slate-800 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
                                                        autoFocus
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleReject(v.id)}
                                                            disabled={processing === v.id}
                                                            className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
                                                        >
                                                            {processing === v.id ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Confirmer le refus'}
                                                        </button>
                                                        <button
                                                            onClick={() => { setRejectingId(null); setRejectReason('') }}
                                                            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
                                                        >
                                                            Annuler
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleApprove(v.id)}
                                                        disabled={processing === v.id}
                                                        className="flex-1 py-3 rounded-xl bg-green-500 text-white text-xs font-black uppercase hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                                                    >
                                                        {processing === v.id ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Approuver</>}
                                                    </button>
                                                    <button
                                                        onClick={() => setRejectingId(v.id)}
                                                        className="flex-1 py-3 rounded-xl bg-red-100 dark:bg-red-900/20 text-red-500 text-xs font-black uppercase hover:bg-red-200 transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        <X size={14} /> Refuser
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}

                {/* Modal zoom image */}
                {zoomImage && (
                    <div
                        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                        onClick={() => setZoomImage(null)}
                    >
                        <div className="relative w-full max-w-3xl aspect-video rounded-2xl overflow-hidden">
                            <img src={zoomImage} alt="Zoom" className="absolute inset-0 h-full w-full object-contain" loading="lazy" decoding="async" />
                        </div>
                        <button
                            onClick={() => setZoomImage(null)}
                            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}
            </div>
    )
}
