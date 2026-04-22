'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    HERO_PRICES_FCFA,
    TILE_PRICES_FCFA,
} from '@/lib/adCampaignPricing'
import { cancelVendorAdCampaign } from '@/app/actions/vendorAdCampaigns'
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

export default function VendorAdCampaignsClient({ initialCampaigns }: { initialCampaigns: CampaignRow[] }) {
    const router = useRouter()
    const [campaigns, setCampaigns] = useState<CampaignRow[]>(initialCampaigns)
    const [loading, setLoading] = useState(false)
    const [paymentModalCampaign, setPaymentModalCampaign] = useState<CampaignRow | null>(null)

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

            {/* Bannière info — création via formulaire produit */}
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
