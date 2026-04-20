'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
    Shield, Upload, Camera, CreditCard, CheckCircle, Clock,
    XCircle, ArrowLeft, Loader2, BookOpen, Smartphone,
} from 'lucide-react'
import { toast } from 'sonner'
import { submitVerification } from '@/app/actions/verifications'

interface Props {
    user: any
    profile: any
    existingVerification: any
}

const BUCKET = 'vendor-verifications'

// ── Helpers ────────────────────────────────────────────────────────────────
function extFromFile(file: File): string {
    const fromName = file.name.split('.').pop()?.toLowerCase()
    if (fromName && ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(fromName)) {
        return fromName === 'jpeg' ? 'jpg' : fromName
    }
    if (file.type === 'image/png') return 'png'
    if (file.type === 'image/webp') return 'webp'
    if (file.type === 'image/gif') return 'gif'
    return 'jpg'
}

function contentTypeForFile(file: File, ext: string): string {
    if (file.type && file.type.startsWith('image/')) return file.type
    if (ext === 'png') return 'image/png'
    if (ext === 'webp') return 'image/webp'
    if (ext === 'gif') return 'image/gif'
    return 'image/jpeg'
}

// ── Tooltip "?" ────────────────────────────────────────────────────────────
function InfoTooltip({ why, howUsed }: { why: string; howUsed: string }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    return (
        <div ref={ref} className="relative inline-flex">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 text-[10px] font-black flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                aria-label="En savoir plus"
            >
                ?
            </button>
            {open && (
                <div className="absolute left-0 top-7 z-50 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-4 text-left">
                    <div className="mb-3">
                        <p className="text-[10px] font-black uppercase text-blue-500 tracking-wider mb-1">Pourquoi on demande ça ?</p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{why}</p>
                    </div>
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Ce qu&apos;on en fait</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{howUsed}</p>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Label de section ───────────────────────────────────────────────────────
function SectionLabel({
    icon: Icon,
    label,
    why,
    howUsed,
    optional,
}: {
    icon: React.ElementType
    label: string
    why: string
    howUsed: string
    optional?: boolean
}) {
    return (
        <div className="flex items-center gap-2 mb-2">
            <Icon size={14} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wide">
                {label}
            </span>
            {optional && (
                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                    Optionnel
                </span>
            )}
            <InfoTooltip why={why} howUsed={howUsed} />
        </div>
    )
}

// ── Composant principal ────────────────────────────────────────────────────
export default function VendorVerificationClient({ user, profile, existingVerification }: Props) {
    const router = useRouter()
    const supabase = getSupabaseBrowserClient()
    const status = profile?.verification_status || 'unverified'

    const [idType, setIdType] = useState<'cni' | 'passport'>('cni')
    const [shopPhoto, setShopPhoto] = useState<File | null>(null)
    const [shopPhotoPreview, setShopPhotoPreview] = useState<string | null>(null)
    const [cniPhoto, setCniPhoto] = useState<File | null>(null)
    const [cniPhotoPreview, setCniPhotoPreview] = useState<string | null>(null)
    const [passportPhoto, setPassportPhoto] = useState<File | null>(null)
    const [passportPhotoPreview, setPassportPhotoPreview] = useState<string | null>(null)
    const [idName, setIdName] = useState('')
    const [momoName, setMomoName] = useState('')
    const [momoNumber, setMomoNumber] = useState('')
    const [momoOperator, setMomoOperator] = useState<'MTN' | 'Airtel'>('MTN')
    const [niuNumber, setNiuNumber] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleFileSelect = (file: File, type: 'shop' | 'cni' | 'passport') => {
        if (file.size > 5 * 1024 * 1024) { toast.error('La photo ne doit pas dépasser 5 Mo'); return }
        if (!file.type.startsWith('image/')) { toast.error('Seules les images sont acceptées'); return }
        const preview = URL.createObjectURL(file)
        if (type === 'shop') { setShopPhoto(file); setShopPhotoPreview(preview) }
        else if (type === 'cni') { setCniPhoto(file); setCniPhotoPreview(preview) }
        else { setPassportPhoto(file); setPassportPhotoPreview(preview) }
    }

    const uploadImage = async (file: File, basePath: string): Promise<string | null> => {
        const ext = extFromFile(file)
        const path = `${basePath}.${ext}`
        const contentType = contentTypeForFile(file, ext)
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType, upsert: true })
        if (error) {
            toast.error(
                error.message.includes('Bucket not found')
                    ? 'Bucket Storage « vendor-verifications » manquant. Exécutez supabase-vendors-storage-and-profiles-unlock.sql.'
                    : `Upload : ${error.message}`
            )
            return null
        }
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
        return data.publicUrl
    }

    const handleSubmit = async () => {
        if (!shopPhoto) { toast.error('La photo de votre boutique est obligatoire'); return }
        if (idType === 'cni' && !cniPhoto) { toast.error('La photo de votre CNI est obligatoire'); return }
        if (idType === 'passport' && !passportPhoto) { toast.error('La photo de votre passeport est obligatoire'); return }
        if (!idName.trim() || !momoName.trim()) { toast.error('Les noms sont obligatoires'); return }
        const momoDigits = momoNumber.replace(/\D/g, '')
        if (momoDigits.length !== 9) { toast.error('Le numéro Mobile Money doit contenir 9 chiffres (sans +242)'); return }

        setSubmitting(true)
        try {
            const timestamp = Date.now()
            const shopPhotoUrl = await uploadImage(shopPhoto, `verifications/${user.id}/${timestamp}-shop`)
            if (!shopPhotoUrl) return

            let cniPhotoUrl: string | undefined
            let passportPhotoUrl: string | undefined

            if (idType === 'cni' && cniPhoto) {
                cniPhotoUrl = await uploadImage(cniPhoto, `verifications/${user.id}/${timestamp}-cni`) ?? undefined
                if (!cniPhotoUrl) return
            }
            if (idType === 'passport' && passportPhoto) {
                passportPhotoUrl = await uploadImage(passportPhoto, `verifications/${user.id}/${timestamp}-passport`) ?? undefined
                if (!passportPhotoUrl) return
            }

            const result = await submitVerification({
                idType,
                shopPhotoUrl,
                cniPhotoUrl,
                passportPhotoUrl,
                cniName: idName.trim(),
                momoName: momoName.trim(),
                momoNumber: momoDigits,
                momoOperator,
                niuNumber: niuNumber.trim() || undefined,
            })

            if (result.error) { toast.error(result.error) }
            else { toast.success('Demande de vérification envoyée !'); router.refresh() }
        } catch {
            toast.error('Une erreur est survenue')
        } finally {
            setSubmitting(false)
        }
    }

    // ── Écran : déjà vérifié ───────────────────────────────────────────────
    if (status === 'verified') {
        return (
            <div className="max-w-lg mx-auto px-4 py-16 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <CheckCircle size={40} className="text-green-500" />
                </div>
                <h1 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white mb-2">Compte vérifié</h1>
                <p className="text-sm text-slate-400 mb-6">Votre identité a été vérifiée. Vous pouvez publier vos produits librement.</p>
                <Link href="/vendor/dashboard" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 transition-colors no-underline">
                    <ArrowLeft size={16} /> Retour au dashboard
                </Link>
            </div>
        )
    }

    // ── Écran : en attente ─────────────────────────────────────────────────
    if (status === 'pending') {
        return (
            <div className="max-w-lg mx-auto px-4 py-16 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <Clock size={40} className="text-blue-500" />
                </div>
                <h1 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white mb-2">Vérification en cours</h1>
                <p className="text-sm text-slate-400 mb-2">Notre équipe examine votre dossier. Cela prend généralement 24 à 48 heures.</p>
                <p className="text-xs text-slate-400 mb-6">Vous recevrez une notification dès que votre compte sera vérifié.</p>

                {existingVerification && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 text-left mb-6">
                        <h3 className="text-xs font-bold uppercase text-slate-400 mb-3">Votre soumission</h3>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 mb-1">Photo boutique</p>
                                <div className="relative w-full aspect-video rounded-xl overflow-hidden">
                                    <img src={existingVerification.shop_photo_url} alt="Boutique" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 mb-1">
                                    {existingVerification.id_type === 'passport' ? 'Passeport' : 'CNI'}
                                </p>
                                <div className="relative w-full aspect-video rounded-xl overflow-hidden">
                                    <img
                                        src={existingVerification.id_type === 'passport'
                                            ? existingVerification.passport_photo_url
                                            : existingVerification.cni_photo_url}
                                        alt="Pièce d'identité"
                                        className="absolute inset-0 h-full w-full object-cover"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1 text-xs">
                            <p><span className="text-slate-400">Nom :</span> <span className="font-bold dark:text-white">{existingVerification.cni_name}</span></p>
                            <p><span className="text-slate-400">Nom MoMo :</span> <span className="font-bold dark:text-white">{existingVerification.momo_name}</span></p>
                            <p><span className="text-slate-400">Numéro :</span> <span className="font-bold dark:text-white">{existingVerification.momo_number} ({existingVerification.momo_operator})</span></p>
                            {existingVerification.niu_number && (
                                <p><span className="text-slate-400">NIU :</span> <span className="font-bold dark:text-white">{existingVerification.niu_number}</span></p>
                            )}
                        </div>
                    </div>
                )}

                <Link href="/vendor/dashboard" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-sm hover:bg-slate-300 transition-colors no-underline">
                    <ArrowLeft size={16} /> Retour au dashboard
                </Link>
            </div>
        )
    }

    // ── Formulaire (unverified ou rejected) ────────────────────────────────
    const currentIdPhoto = idType === 'cni' ? cniPhotoPreview : passportPhotoPreview

    return (
        <div className="max-w-lg mx-auto px-4 py-8">
            <Link href="/vendor/dashboard" className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 mb-6 no-underline">
                <ArrowLeft size={14} /> Retour au dashboard
            </Link>

            <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <Shield size={28} className="text-white" />
                </div>
                <h1 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white mb-1">Vérification vendeur</h1>
                <p className="text-xs text-slate-400">Vérifiez votre identité pour pouvoir publier vos produits</p>
            </div>

            {/* Message de rejet */}
            {status === 'rejected' && existingVerification?.rejection_reason && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 mb-6">
                    <div className="flex items-center gap-2 mb-1">
                        <XCircle size={16} className="text-red-500" />
                        <p className="text-xs font-bold text-red-600 dark:text-red-400">Demande précédente refusée</p>
                    </div>
                    <p className="text-xs text-red-500">Motif : {existingVerification.rejection_reason}</p>
                </div>
            )}

            <div className="space-y-6">

                {/* ══════════════════════════════════════════════════
                    1. PHOTO DANS LA BOUTIQUE
                ══════════════════════════════════════════════════ */}
                <div>
                    <SectionLabel
                        icon={Camera}
                        label="Photo de vous dans votre boutique"
                        why="Cette photo confirme que vous exercez une activité commerciale réelle. Elle prouve que votre boutique ou espace de vente existe physiquement."
                        howUsed="Elle est examinée uniquement par notre équipe de modération, puis archivée de façon sécurisée. Elle n'est jamais publiée ni partagée."
                    />
                    <div
                        className={`relative w-full aspect-video rounded-2xl border-2 border-dashed overflow-hidden cursor-pointer transition-colors ${
                            shopPhotoPreview
                                ? 'border-green-300 dark:border-green-700'
                                : 'border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700'
                        }`}
                        onClick={() => document.getElementById('shop-photo-input')?.click()}
                    >
                        {shopPhotoPreview ? (
                            <img src={shopPhotoPreview} alt="Preview" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                <Upload size={28} className="mb-2" />
                                <p className="text-xs font-bold">Cliquez pour ajouter</p>
                                <p className="text-[10px]">JPG, PNG — max 5 Mo</p>
                            </div>
                        )}
                    </div>
                    <input id="shop-photo-input" type="file" accept="image/*" className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'shop')} />
                </div>

                {/* ══════════════════════════════════════════════════
                    2. PIÈCE D'IDENTITÉ
                ══════════════════════════════════════════════════ */}
                <div>
                    <SectionLabel
                        icon={CreditCard}
                        label="Pièce d'identité"
                        why="Nous vérifions que vous êtes bien la personne qui gère ce compte. Cela protège les acheteurs et garantit la fiabilité de la plateforme."
                        howUsed="Vos documents sont stockés de façon chiffrée dans notre espace sécurisé. Ils ne sont jamais partagés avec des tiers ni utilisés à d'autres fins que la vérification."
                    />

                    {/* Toggle CNI / Passeport */}
                    <div className="flex gap-2 mb-3">
                        {([
                            { id: 'cni' as const, label: '🪪 CNI', sub: 'Carte Nationale' },
                            { id: 'passport' as const, label: '📗 Passeport', sub: 'Pour étrangers' },
                        ]).map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setIdType(opt.id)}
                                className={`flex-1 py-2.5 px-3 rounded-xl border-2 transition-all text-left ${
                                    idType === opt.id
                                        ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/10'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                }`}
                            >
                                <p className={`text-xs font-black ${idType === opt.id ? 'text-orange-600 dark:text-orange-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                    {opt.label}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{opt.sub}</p>
                            </button>
                        ))}
                    </div>

                    {/* Zone upload photo */}
                    <div
                        className={`relative w-full aspect-video rounded-2xl border-2 border-dashed overflow-hidden cursor-pointer transition-colors ${
                            currentIdPhoto
                                ? 'border-green-300 dark:border-green-700'
                                : 'border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700'
                        }`}
                        onClick={() => document.getElementById('id-photo-input')?.click()}
                    >
                        {currentIdPhoto ? (
                            <img src={currentIdPhoto} alt="Pièce d'identité" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                <Upload size={28} className="mb-2" />
                                <p className="text-xs font-bold">
                                    {idType === 'cni' ? 'Photo recto de votre CNI' : 'Page principale du passeport'}
                                </p>
                                <p className="text-[10px]">JPG, PNG — max 5 Mo</p>
                            </div>
                        )}
                    </div>
                    <input id="id-photo-input" type="file" accept="image/*" className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], idType === 'cni' ? 'cni' : 'passport')} />

                    {/* Nom sur la pièce */}
                    <div className="mt-3">
                        <label className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 block">
                            Nom complet sur {idType === 'cni' ? 'la CNI' : 'le passeport'}
                        </label>
                        <input
                            type="text"
                            value={idName}
                            onChange={(e) => setIdName(e.target.value)}
                            placeholder="Ex : MBOUNGOU Jean-Pierre"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                        />
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════
                    3. MOBILE MONEY
                ══════════════════════════════════════════════════ */}
                <div className="space-y-4">
                    <SectionLabel
                        icon={Smartphone}
                        label="Compte Mobile Money"
                        why="Votre compte Mobile Money est le canal par lequel vous recevez vos paiements des commandes. Le nom doit correspondre à votre pièce d'identité pour éviter tout blocage lors des virements."
                        howUsed="Seuls votre numéro et votre opérateur sont enregistrés dans notre système de paiement. Ils ne sont jamais affichés publiquement sur votre profil."
                    />

                    {/* Opérateur */}
                    <div className="flex gap-3">
                        {(['MTN', 'Airtel'] as const).map((op) => (
                            <button
                                key={op}
                                type="button"
                                onClick={() => setMomoOperator(op)}
                                className={`flex-1 py-3 rounded-xl border-2 text-sm font-black uppercase transition-all ${
                                    momoOperator === op
                                        ? op === 'MTN'
                                            ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10 text-yellow-600'
                                            : 'border-red-400 bg-red-50 dark:bg-red-900/10 text-red-600'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'
                                }`}
                            >
                                {op === 'MTN' ? '🟡 MTN MoMo' : '🔴 Airtel Money'}
                            </button>
                        ))}
                    </div>

                    {/* Nom MoMo */}
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 block">
                            Nom sur le compte Mobile Money
                        </label>
                        <input
                            type="text"
                            value={momoName}
                            onChange={(e) => setMomoName(e.target.value)}
                            placeholder="Ex : MBOUNGOU Jean-Pierre"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                        />
                        {idName && momoName && idName.trim().toLowerCase() !== momoName.trim().toLowerCase() && (
                            <p className="text-[10px] font-bold text-amber-500 mt-1">
                                ⚠️ Le nom sur la pièce d&apos;identité et le nom Mobile Money ne correspondent pas
                            </p>
                        )}
                    </div>

                    {/* Numéro */}
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 block">
                            Numéro Mobile Money
                        </label>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-400 px-3 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl">+242</span>
                            <input
                                type="tel"
                                value={momoNumber}
                                onChange={(e) => setMomoNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                                placeholder="XX XXX XXXX"
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                            />
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════
                    4. NIU (OPTIONNEL)
                ══════════════════════════════════════════════════ */}
                <div>
                    <SectionLabel
                        icon={BookOpen}
                        label="NIU / RCCM"
                        why="Le NIU (Numéro d'Identification Unique) ou RCCM atteste que votre activité commerciale est officiellement enregistrée auprès des autorités congolaises."
                        howUsed="Ce champ est entièrement facultatif. Le renseigner vous permet d'obtenir le badge « Entreprise vérifiée » sur votre profil, ce qui renforce la confiance des acheteurs."
                        optional
                    />
                    <input
                        type="text"
                        value={niuNumber}
                        onChange={(e) => setNiuNumber(e.target.value.toUpperCase())}
                        placeholder="Ex : M2024-XXXXX"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1.5">
                        Numéro d&apos;Identification Unique ou numéro RCCM (Registre du Commerce)
                    </p>
                </div>

                {/* ══════════════════════════════════════════════════
                    BOUTON SOUMETTRE
                ══════════════════════════════════════════════════ */}
                <button
                    onClick={handleSubmit}
                    disabled={
                        submitting ||
                        !shopPhoto ||
                        (idType === 'cni' ? !cniPhoto : !passportPhoto) ||
                        !idName.trim() ||
                        !momoName.trim() ||
                        !momoNumber.trim()
                    }
                    className="w-full py-4 rounded-2xl text-sm font-black uppercase text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #E8A838, #D4341C)' }}
                >
                    {submitting ? (
                        <span className="flex items-center justify-center gap-2">
                            <Loader2 size={16} className="animate-spin" />
                            Envoi en cours...
                        </span>
                    ) : (
                        'Soumettre ma vérification'
                    )}
                </button>

                <p className="text-[10px] text-slate-400 text-center">
                    Vos informations sont confidentielles et uniquement utilisées pour vérifier votre identité.
                </p>
            </div>
        </div>
    )
}
