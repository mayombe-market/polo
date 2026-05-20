'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    HERO_PRICES_FCFA,
    TILE_PRICES_FCFA,
} from '@/lib/adCampaignPricing'
import { cancelVendorAdCampaign, submitVendorAdCampaign } from '@/app/actions/vendorAdCampaigns'
import { priceForCampaign, type AdPlacement, type AdDurationDays, isDurationDays } from '@/lib/adCampaignPricing'
import VendorAdPaymentModal from './VendorAdPaymentModal'
import { toast } from 'sonner'
import { Loader2, Megaphone, ArrowLeft, Info } from 'lucide-react'

type CampaignRow = {
    id: string
    status: string
    placement: string
    duration_days: number
    price_fcfa: number
    link_url: string
    link_type: string
    image_url: string
    title?: string | null
    payment_note?: string | null
    payment_method?: string | null
    transaction_id?: string | null
    paid_at?: string | null
    reject_reason?: string | null
    start_date?: string | null
    end_date?: string | null
    created_at?: string
}

type NewCampaignDraft = {
    imageUrl: string
    title: string
    placement: AdPlacement
    durationDays: AdDurationDays
}

const DURATIONS: AdDurationDays[] = [3, 7, 14, 30]

export default function VendorAdCampaignsClient({
    initialCampaigns,
    vendorType,
    vendorId,
}: {
    initialCampaigns: CampaignRow[]
    vendorType: string | null
    vendorId: string
}) {
    const router = useRouter()
    const [campaigns, setCampaigns] = useState<CampaignRow[]>(initialCampaigns)
    const [loading, setLoading] = useState(false)
    const [paymentModalCampaign, setPaymentModalCampaign] = useState<CampaignRow | null>(null)

    // Form création standalone (patisserie / restaurant)
    const isShopVendor = vendorType === 'patisserie' || vendorType === 'restaurant'
    const [showForm, setShowForm] = useState(false)
    const [draft, setDraft] = useState<NewCampaignDraft>({
        imageUrl: '', title: '', placement: 'tile', durationDays: 7,
    })
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState('')

    const draftPrice = priceForCampaign(draft.placement, draft.durationDays)

    const handleCreateCampaign = async () => {
        if (!draft.imageUrl.trim()) { setCreateError('Ajoutez une image pour la pub'); return }
        setCreateError('')
        setCreating(true)
        const res = await submitVendorAdCampaign({
            linkType: vendorType as 'patisserie' | 'restaurant',
            imageUrl: draft.imageUrl.trim(),
            title: draft.title.trim() || undefined,
            placement: draft.placement,
            durationDays: draft.durationDays,
        })
        setCreating(false)
        if (res.error) { setCreateError(res.error); return }
        setShowForm(false)
        setDraft({ imageUrl: '', title: '', placement: 'tile', durationDays: 7 })
        // Ajouter la campagne à la liste locale et ouvrir le modal de paiement immédiatement
        if (res.campaign) {
            const c = res.campaign as CampaignRow
            setCampaigns(prev => [c, ...prev])
            setPaymentModalCampaign(c)
        }
    }

    useEffect(() => {
        setCampaigns(initialCampaigns)
    }, [initialCampaigns])

    const refresh = async () => { router.refresh() }

    const onCancel = async (id: string) => {
        setLoading(true)
        const res = await cancelVendorAdCampaign(id)
        setLoading(false)
        if (res.error) { toast.error(res.error); return }
        toast.success('Campagne annulée')
        await refresh()
    }

    const statusLabel = (s: string) => {
        switch (s) {
            case 'pending_payment':
                return 'En attente de paiement'
            case 'pending_review':
                return 'En validation'
            case 'active':
                return 'Active'
            case 'rejected':
                return 'Refusée'
            case 'expired':
                return 'Expirée'
            case 'cancelled':
                return 'Annulée'
            default:
                return s
        }
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
            <Link
                href="/vendor/dashboard"
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-orange-500 mb-8"
            >
                <ArrowLeft size={16} />
                Retour au tableau de bord
            </Link>

            <div className="flex items-center gap-3 mb-2">
                <Megaphone className="text-orange-500" size={28} />
                <h1 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
                    Campagnes publicitaires
                </h1>
            </div>
            <p className="text-sm text-slate-500 mb-10">
                Tarifs indicatifs : hero {Object.entries(HERO_PRICES_FCFA).map(([d, p]) => `${d}j ${p.toLocaleString('fr-FR')} F`).join(' · ')} — tuile{' '}
                {Object.entries(TILE_PRICES_FCFA).map(([d, p]) => `${d}j ${p.toLocaleString('fr-FR')} F`).join(' · ')}. Vous payez d&apos;abord, puis l&apos;équipe valide
                et fixe les dates de diffusion.
            </p>

            {/* Bannière info — selon le type de vendeur */}
            {isShopVendor ? (
                <div className="mb-8">
                    <button
                        type="button"
                        onClick={() => { setShowForm(v => !v); setCreateError('') }}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-orange-500 text-white font-black uppercase italic text-sm shadow-lg shadow-orange-500/20 hover:bg-orange-600 active:scale-[0.98] transition-all"
                    >
                        <Megaphone size={16} />
                        {showForm ? 'Annuler' : 'Créer une nouvelle pub'}
                    </button>

                    {showForm && (
                        <div className="mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
                            <h3 className="text-sm font-black uppercase italic text-slate-900 dark:text-white">
                                Nouvelle campagne — {vendorType === 'patisserie' ? 'Pâtisserie' : 'Restaurant'}
                            </h3>

                            {/* Image */}
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5">
                                    URL de l&apos;image publicitaire *
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://…"
                                    value={draft.imageUrl}
                                    onChange={e => setDraft(d => ({ ...d, imageUrl: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none focus:border-orange-400"
                                />
                                {draft.imageUrl && (
                                    <img src={draft.imageUrl} alt="" className="mt-2 h-28 w-full object-cover rounded-xl" onError={e => (e.currentTarget.style.display = 'none')} />
                                )}
                            </div>

                            {/* Titre */}
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5">
                                    Titre (facultatif)
                                </label>
                                <input
                                    type="text"
                                    placeholder="ex : Gâteau de mariage sur commande"
                                    value={draft.title}
                                    onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold outline-none focus:border-orange-400"
                                />
                            </div>

                            {/* Emplacement */}
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">
                                    Emplacement
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['hero', 'tile'] as AdPlacement[]).map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setDraft(d => ({ ...d, placement: p }))}
                                            className={`py-3 rounded-xl border-2 text-xs font-black uppercase transition-all ${draft.placement === p ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-600' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                                        >
                                            {p === 'hero' ? '🎯 Hero (grande bannière)' : '📌 Tuile (grille produits)'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Durée */}
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">
                                    Durée
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {DURATIONS.map(d => (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => setDraft(dr => ({ ...dr, durationDays: d }))}
                                            className={`py-3 rounded-xl border-2 text-xs font-black transition-all ${draft.durationDays === d ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-600' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                                        >
                                            {d} j
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Prix + récap */}
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Total</p>
                                    <p className="text-xl font-black italic text-orange-500">{draftPrice.toLocaleString('fr-FR')} FCFA</p>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 text-right">
                                    {draft.placement === 'hero' ? 'Grande bannière' : 'Tuile produit'}<br />
                                    {draft.durationDays} jours
                                </p>
                            </div>

                            {createError && (
                                <p className="text-xs font-bold text-red-500">⚠ {createError}</p>
                            )}

                            <button
                                type="button"
                                disabled={creating}
                                onClick={handleCreateCampaign}
                                className="w-full py-4 rounded-2xl font-black uppercase italic text-sm bg-orange-500 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {creating ? <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" />Création…</span> : `Créer & payer ${draftPrice.toLocaleString('fr-FR')} FCFA →`}
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex items-start gap-3 bg-orange-50 dark:bg-orange-500/5 border border-orange-200 dark:border-orange-500/20 rounded-2xl p-4 mb-10">
                    <Info size={16} className="text-orange-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-black text-orange-700 dark:text-orange-400 mb-1">
                            Comment créer une publicité ?
                        </p>
                        <p className="text-xs text-orange-600/80 dark:text-orange-400/70 leading-relaxed">
                            Publiez un produit depuis votre dashboard — à la fin de la publication, un assistant vous proposera automatiquement de créer une pub avec le choix de l&apos;emplacement, des dates et du paiement.
                        </p>
                        <Link
                            href="/vendor/dashboard?tab=products"
                            className="inline-block mt-2 text-xs font-black uppercase text-orange-500 hover:underline"
                        >
                            → Aller à mes produits
                        </Link>
                    </div>
                </div>
            )}

            <h2 className="text-sm font-black uppercase italic text-slate-800 dark:text-white mb-4">Mes campagnes</h2>
            {campaigns.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune campagne pour le moment.</p>
            ) : (
                <ul className="space-y-4">
                    {campaigns.map((c) => (
                        <li
                            key={c.id}
                            className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col md:flex-row gap-4"
                        >
                            <img
                                src={c.image_url || '/placeholder-image.svg'}
                                alt=""
                                className="w-full md:w-40 h-28 object-cover rounded-xl shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                                        {statusLabel(c.status)}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                        {c.placement === 'hero' ? 'Hero' : 'Tuile'} · {c.duration_days} j ·{' '}
                                        {c.price_fcfa?.toLocaleString('fr-FR')} F
                                    </span>
                                </div>
                                <p className="text-sm font-bold truncate text-slate-900 dark:text-white">{c.title || 'Sans titre'}</p>
                                <a href={c.link_url} target="_blank" rel="noreferrer" className="text-xs text-orange-500 truncate block">
                                    {c.link_url}
                                </a>
                                {c.status === 'rejected' && c.reject_reason ? (
                                    <p className="text-xs text-red-600 mt-2">Motif : {c.reject_reason}</p>
                                ) : null}
                                {c.status === 'active' && c.start_date && c.end_date ? (
                                    <p className="text-xs text-slate-500 mt-2">
                                        Du {new Date(c.start_date).toLocaleDateString('fr-FR')} au{' '}
                                        {new Date(c.end_date).toLocaleDateString('fr-FR')}
                                    </p>
                                ) : null}

                                {c.status === 'pending_payment' && (
                                    <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-end">
                                        <button
                                            type="button"
                                            onClick={() => setPaymentModalCampaign(c)}
                                            className="rounded-xl bg-orange-500 text-white px-4 py-2 text-[10px] font-black uppercase shadow-md shadow-orange-500/20 hover:bg-orange-600"
                                        >
                                            Payer
                                        </button>
                                        <button
                                            type="button"
                                            disabled={loading}
                                            onClick={() => onCancel(c.id)}
                                            className="text-[10px] font-black uppercase text-slate-400 hover:text-red-500"
                                        >
                                            Annuler la campagne
                                        </button>
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {paymentModalCampaign ? (
                <VendorAdPaymentModal
                    campaignId={paymentModalCampaign.id}
                    campaignTitle={paymentModalCampaign.title || 'Sans titre'}
                    priceFcfa={Number(paymentModalCampaign.price_fcfa) || 0}
                    isOpen={!!paymentModalCampaign}
                    onClose={() => setPaymentModalCampaign(null)}
                    onSuccess={async () => {
                        toast.success('Paiement déclaré — en attente de validation admin.')
                        await refresh()
                    }}
                />
            ) : null}
        </div>
    )
}
