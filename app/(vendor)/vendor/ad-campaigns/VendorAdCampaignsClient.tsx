'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
    HERO_PRICES_FCFA,
    TILE_PRICES_FCFA,
    priceForCampaign,
    type AdDurationDays,
    type AdPlacement,
} from '@/lib/adCampaignPricing'
import { submitVendorAdCampaign, cancelVendorAdCampaign } from '@/app/actions/vendorAdCampaigns'
import VendorAdPaymentModal from './VendorAdPaymentModal'
import { toast } from 'sonner'
import { Loader2, Megaphone, Upload, ArrowLeft } from 'lucide-react'

const DURATIONS: AdDurationDays[] = [3, 7, 14, 30]

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
    const supabase = getSupabaseBrowserClient()
    const [campaigns, setCampaigns] = useState<CampaignRow[]>(initialCampaigns)

    useEffect(() => {
        setCampaigns(initialCampaigns)
    }, [initialCampaigns])
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)

    const [linkType, setLinkType] = useState<'product' | 'store'>('product')
    const [linkUrl, setLinkUrl] = useState('')
    const [imageUrl, setImageUrl] = useState('')
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [placement, setPlacement] = useState<AdPlacement>('hero')
    const [durationDays, setDurationDays] = useState<AdDurationDays>(7)
    const [paymentModalCampaign, setPaymentModalCampaign] = useState<CampaignRow | null>(null)

    const refresh = async () => {
        router.refresh()
    }

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true)
            if (!e.target.files?.[0]) return
            const file = e.target.files[0]
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image trop lourde (max 5 Mo)')
                return
            }
            const {
                data: { user },
            } = await supabase.auth.getUser()
            if (!user) {
                toast.error('Session expirée')
                return
            }
            const ext = file.name.split('.').pop()
            const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
            const filePath = `campaigns/${user.id}/${fileName}`
            const { error: upErr } = await supabase.storage.from('ads').upload(filePath, file)
            if (upErr) throw upErr
            const { data } = supabase.storage.from('ads').getPublicUrl(filePath)
            setImageUrl(data.publicUrl)
            toast.success('Image importée')
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Erreur upload')
        } finally {
            setUploading(false)
        }
    }

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const res = await submitVendorAdCampaign({
            linkUrl,
            linkType,
            imageUrl,
            title: title.trim() || undefined,
            description: description.trim() || undefined,
            placement,
            durationDays,
        })
        setLoading(false)
        if (res.error) {
            toast.error(res.error)
            return
        }
        toast.success('Campagne créée — procédez au paiement puis déclarez-le ci-dessous.')
        setLinkUrl('')
        setImageUrl('')
        setTitle('')
        setDescription('')
        await refresh()
    }

    const onCancel = async (id: string) => {
        setLoading(true)
        const res = await cancelVendorAdCampaign(id)
        setLoading(false)
        if (res.error) {
            toast.error(res.error)
            return
        }
        toast.success('Campagne annulée')
        await refresh()
    }

    const pricePreview = priceForCampaign(placement, durationDays)

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

            <form onSubmit={onSubmit} className="space-y-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 mb-14">
                <h2 className="text-sm font-black uppercase italic text-slate-800 dark:text-white">Nouvelle campagne</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block text-[10px] font-black uppercase text-slate-400">
                        Emplacement
                        <select
                            value={placement}
                            onChange={(e) => setPlacement(e.target.value as AdPlacement)}
                            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                        >
                            <option value="hero">Hero (carrousel — max 7 avec les bannières site)</option>
                            <option value="tile">Tuile (grande + rangée)</option>
                        </select>
                    </label>
                    <label className="block text-[10px] font-black uppercase text-slate-400">
                        Durée (jours)
                        <select
                            value={durationDays}
                            onChange={(e) => setDurationDays(Number(e.target.value) as AdDurationDays)}
                            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                        >
                            {DURATIONS.map((d) => (
                                <option key={d} value={d}>
                                    {d} j — {priceForCampaign(placement, d).toLocaleString('fr-FR')} FCFA
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <p className="text-xs font-bold text-orange-600 dark:text-orange-400">
                    Prix pour cette sélection : {pricePreview.toLocaleString('fr-FR')} FCFA
                </p>

                <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" checked={linkType === 'product'} onChange={() => setLinkType('product')} />
                        Lien produit
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" checked={linkType === 'store'} onChange={() => setLinkType('store')} />
                        Lien boutique
                    </label>
                </div>

                <label className="block text-[10px] font-black uppercase text-slate-400">
                    URL (page produit ou boutique Mayombe)
                    <input
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://…/product/… ou …/store/…"
                        className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                        required
                    />
                </label>

                <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Visuel</p>
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-black uppercase cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700">
                            <Upload size={14} />
                            {uploading ? '…' : 'Importer'}
                            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                        </label>
                        {imageUrl ? (
                            <span className="text-xs text-green-600 font-bold truncate max-w-[200px]">Image OK</span>
                        ) : null}
                    </div>
                    <input
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="Ou URL d’image directe"
                        className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                        required
                    />
                </div>

                <label className="block text-[10px] font-black uppercase text-slate-400">
                    Titre (optionnel)
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                    />
                </label>
                <label className="block text-[10px] font-black uppercase text-slate-400">
                    Texte court (optionnel, affiché sous le titre en hero)
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                    />
                </label>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto rounded-2xl bg-orange-500 text-white px-8 py-3 text-xs font-black uppercase tracking-wide shadow-lg shadow-orange-500/25 hover:bg-orange-600 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : null}
                    Créer la campagne (à payer ensuite)
                </button>
            </form>

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
