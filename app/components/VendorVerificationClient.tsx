'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
    Shield, Upload, CreditCard, CheckCircle, Clock,
    XCircle, ArrowLeft, Loader2, BookOpen, MapPin, Navigation,
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
}: {
    icon: React.ElementType
    label: string
    why: string
    howUsed: string
}) {
    return (
        <div className="flex items-center gap-2 mb-2">
            <Icon size={14} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wide">
                {label}
            </span>
            <InfoTooltip why={why} howUsed={howUsed} />
        </div>
    )
}

// ── Options de pièce d'identité ────────────────────────────────────────────
const ID_OPTIONS = [
    { id: 'cni' as const,      label: 'CNI',       sub: 'Carte Nationale' },
    { id: 'passport' as const, label: 'Passeport', sub: 'Pour étrangers'  },
    { id: 'permis' as const,   label: 'Permis',    sub: 'Permis de conduire' },
]

// ── Composant principal ────────────────────────────────────────────────────
export default function VendorVerificationClient({ user, profile, existingVerification }: Props) {
    const router = useRouter()
    const supabase = getSupabaseBrowserClient()
    const status = profile?.verification_status || 'unverified'

    // ── State ──────────────────────────────────────────────────────────────
    const [rccmNumber, setRccmNumber]       = useState('')
    const [idType, setIdType]               = useState<'cni' | 'passport' | 'permis'>('cni')
    const [idPhoto, setIdPhoto]             = useState<File | null>(null)
    const [idPhotoPreview, setIdPhotoPreview] = useState<string | null>(null)
    const [managerName, setManagerName]     = useState('')
    const [niuNumber, setNiuNumber]         = useState('')
    const [address, setAddress]             = useState('')
    const [addressLat, setAddressLat]       = useState<number | null>(null)
    const [addressLng, setAddressLng]       = useState<number | null>(null)
    const [gpsLoading, setGpsLoading]       = useState(false)
    const [gpsConfirmOpen, setGpsConfirmOpen] = useState(false)
    const [submitting, setSubmitting]       = useState(false)

    // ── Handlers ───────────────────────────────────────────────────────────
    const handleFileSelect = (file: File) => {
        if (file.size > 5 * 1024 * 1024) { toast.error('La photo ne doit pas dépasser 5 Mo'); return }
        if (!file.type.startsWith('image/')) { toast.error('Seules les images sont acceptées'); return }
        setIdPhoto(file)
        setIdPhotoPreview(URL.createObjectURL(file))
    }

    const uploadImage = async (file: File, basePath: string): Promise<string | null> => {
        const ext = extFromFile(file)
        const path = `${basePath}.${ext}`
        const contentType = contentTypeForFile(file, ext)
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType, upsert: true })
        if (error) {
            toast.error(
                error.message.includes('Bucket not found')
                    ? 'Bucket Storage « vendor-verifications » manquant.'
                    : `Upload : ${error.message}`
            )
            return null
        }
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
        return data.publicUrl
    }

    const captureGps = () => {
        setGpsConfirmOpen(false)
        setGpsLoading(true)
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude
                const lng = pos.coords.longitude
                setAddressLat(lat)
                setAddressLng(lng)
                if (!address.trim()) {
                    setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)
                }
                setGpsLoading(false)
                toast.success('Position GPS enregistrée')
            },
            () => {
                toast.error("Impossible d'accéder à la position GPS")
                setGpsLoading(false)
            },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    const handleSubmit = async () => {
        if (!rccmNumber.trim()) { toast.error('Le numéro RCCM est obligatoire'); return }
        if (!idPhoto) { toast.error("La photo de la pièce d'identité est obligatoire"); return }
        if (!managerName.trim()) { toast.error('Le nom du gérant est obligatoire'); return }
        if (!niuNumber.trim()) { toast.error('Le NIU est obligatoire'); return }
        if (!address.trim()) { toast.error("L'adresse est obligatoire"); return }

        setSubmitting(true)
        try {
            const timestamp = Date.now()
            const idPhotoUrl = await uploadImage(idPhoto, `verifications/${user.id}/${timestamp}-id`)
            if (!idPhotoUrl) return

            const result = await submitVerification({
                rccmNumber: rccmNumber.trim(),
                idType,
                idPhotoUrl,
                managerName: managerName.trim(),
                niuNumber: niuNumber.trim(),
                address: address.trim(),
                addressLat:  addressLat  ?? undefined,
                addressLng:  addressLng  ?? undefined,
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

                        {/* Photo pièce d'identité */}
                        {existingVerification.id_photo_url && (
                            <div className="mb-3">
                                <p className="text-[10px] font-bold text-slate-400 mb-1">
                                    Pièce d&apos;identité ({existingVerification.id_type?.toUpperCase()})
                                </p>
                                <div className="relative w-full aspect-video rounded-xl overflow-hidden">
                                    <img
                                        src={existingVerification.id_photo_url}
                                        alt="Pièce d'identité"
                                        className="absolute inset-0 h-full w-full object-cover"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1 text-xs">
                            {existingVerification.rccm_number && (
                                <p><span className="text-slate-400">RCCM :</span> <span className="font-bold dark:text-white font-mono">{existingVerification.rccm_number}</span></p>
                            )}
                            {existingVerification.manager_name && (
                                <p><span className="text-slate-400">Gérant :</span> <span className="font-bold dark:text-white">{existingVerification.manager_name}</span></p>
                            )}
                            {existingVerification.niu_number && (
                                <p><span className="text-slate-400">NIU :</span> <span className="font-bold dark:text-white font-mono">{existingVerification.niu_number}</span></p>
                            )}
                            {existingVerification.address && (
                                <p><span className="text-slate-400">Adresse :</span> <span className="font-bold dark:text-white">{existingVerification.address}</span></p>
                            )}
                            {existingVerification.address_lat && existingVerification.address_lng && (
                                <p className="flex items-center gap-1">
                                    <span className="text-slate-400">GPS :</span>
                                    <span className="text-green-500 font-bold font-mono text-[10px]">
                                        {Number(existingVerification.address_lat).toFixed(5)}, {Number(existingVerification.address_lng).toFixed(5)}
                                    </span>
                                </p>
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
                    1. RCCM
                ══════════════════════════════════════════════════ */}
                <div>
                    <SectionLabel
                        icon={BookOpen}
                        label="RCCM"
                        why="Le RCCM (Registre du Commerce et du Crédit Mobilier) atteste que votre activité est officiellement enregistrée au Congo. C'est le document clé pour les commerçants formels."
                        howUsed="Ce numéro est vérifié par notre équipe pour confirmer que votre établissement est légalement constitué. Il n'est jamais affiché publiquement."
                    />
                    <input
                        type="text"
                        value={rccmNumber}
                        onChange={(e) => setRccmNumber(e.target.value.toUpperCase())}
                        placeholder="Ex : BRAZ-2024-B12-00123"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 font-mono tracking-wide"
                    />
                    <p className="text-[10px] text-slate-400 mt-1.5">
                        Registre du Commerce et du Crédit Mobilier (Congo)
                    </p>
                </div>

                {/* ══════════════════════════════════════════════════
                    2. PIÈCE D'IDENTITÉ DU GÉRANT
                ══════════════════════════════════════════════════ */}
                <div>
                    <SectionLabel
                        icon={CreditCard}
                        label="Pièce d'identité du gérant"
                        why="Nous vérifions que la personne qui gère ce compte est réelle et identifiable. Cela protège les acheteurs et garantit la fiabilité de la plateforme."
                        howUsed="Vos documents sont stockés de façon chiffrée dans notre espace sécurisé. Ils ne sont jamais partagés avec des tiers ni utilisés à d'autres fins que la vérification."
                    />

                    {/* Toggle CNI / Passeport / Permis */}
                    <div className="flex gap-2 mb-3">
                        {ID_OPTIONS.map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setIdType(opt.id)}
                                className={`flex-1 py-2.5 px-2 rounded-xl border-2 transition-all text-left ${
                                    idType === opt.id
                                        ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/10'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                }`}
                            >
                                <p className={`text-xs font-black ${idType === opt.id ? 'text-orange-600 dark:text-orange-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                    {opt.label}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{opt.sub}</p>
                            </button>
                        ))}
                    </div>

                    {/* Zone upload photo */}
                    <div
                        className={`relative w-full aspect-video rounded-2xl border-2 border-dashed overflow-hidden cursor-pointer transition-colors ${
                            idPhotoPreview
                                ? 'border-green-300 dark:border-green-700'
                                : 'border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700'
                        }`}
                        onClick={() => document.getElementById('id-photo-input')?.click()}
                    >
                        {idPhotoPreview ? (
                            <img src={idPhotoPreview} alt="Pièce d'identité" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                <Upload size={28} className="mb-2" />
                                <p className="text-xs font-bold">
                                    {idType === 'cni'      ? 'Photo recto de votre CNI'
                                    : idType === 'passport' ? 'Page principale du passeport'
                                    :                        'Recto de votre permis de conduire'}
                                </p>
                                <p className="text-[10px]">JPG, PNG — max 5 Mo</p>
                            </div>
                        )}
                    </div>
                    <input id="id-photo-input" type="file" accept="image/*" className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />

                    {/* Nom du gérant */}
                    <div className="mt-3">
                        <label className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 block">
                            Nom complet du gérant (tel qu&apos;il figure sur la pièce)
                        </label>
                        <input
                            type="text"
                            value={managerName}
                            onChange={(e) => setManagerName(e.target.value)}
                            placeholder="Ex : MBOUNGOU Jean-Pierre"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                        />
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════
                    3. NIU
                ══════════════════════════════════════════════════ */}
                <div>
                    <SectionLabel
                        icon={BookOpen}
                        label="NIU"
                        why="Le NIU (Numéro d'Identification Unique) est votre identifiant fiscal auprès des autorités congolaises. Il prouve que votre activité est déclarée."
                        howUsed="Ce numéro est vérifié par notre équipe pour valider la légalité de votre établissement. Il vous permet d'obtenir le badge « Entreprise vérifiée » sur votre profil."
                    />
                    <input
                        type="text"
                        value={niuNumber}
                        onChange={(e) => setNiuNumber(e.target.value.toUpperCase())}
                        placeholder="Ex : M2024-XXXXX"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1.5">
                        Numéro d&apos;Identification Unique (fiscal)
                    </p>
                </div>

                {/* ══════════════════════════════════════════════════
                    4. ADRESSE
                ══════════════════════════════════════════════════ */}
                <div>
                    <SectionLabel
                        icon={MapPin}
                        label="Adresse de l'établissement"
                        why="L'adresse de votre boutique permet à nos équipes de vérifier l'existence physique de votre établissement et aux acheteurs de vous localiser."
                        howUsed="L'adresse est visible sur votre profil public. Les coordonnées GPS (si fournies) sont utilisées uniquement pour la vérification interne."
                    />

                    {/* Champ de saisie manuelle */}
                    <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Ex : Avenue de la Paix, Moungali, Brazzaville"
                        rows={2}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none"
                    />

                    {/* Bouton GPS */}
                    {!gpsConfirmOpen && (
                        <button
                            type="button"
                            onClick={() => setGpsConfirmOpen(true)}
                            disabled={gpsLoading}
                            className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-xs font-bold hover:border-orange-400 hover:text-orange-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
                        >
                            {gpsLoading ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Localisation en cours...
                                </>
                            ) : (
                                <>
                                    <Navigation size={14} />
                                    Utiliser ma position actuelle
                                </>
                            )}
                        </button>
                    )}

                    {/* Confirmation GPS */}
                    {gpsConfirmOpen && (
                        <div className="mt-2 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30">
                            <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">
                                Accès à votre position GPS
                            </p>
                            <p className="text-[11px] text-blue-600 dark:text-blue-400 mb-3 leading-relaxed">
                                Mayombe Market va utiliser votre position GPS pour enregistrer les coordonnées de votre établissement. Continuer ?
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={captureGps}
                                    className="flex-1 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-black transition-colors"
                                >
                                    Oui, utiliser ma position
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setGpsConfirmOpen(false)}
                                    className="flex-1 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-black hover:bg-slate-300 transition-colors"
                                >
                                    Annuler
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Indicator coordonnées capturées */}
                    {addressLat !== null && addressLng !== null && (
                        <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30">
                            <MapPin size={13} className="text-green-500 flex-shrink-0" />
                            <p className="text-[11px] font-bold text-green-600 dark:text-green-400">
                                Position capturée — {addressLat.toFixed(5)}, {addressLng.toFixed(5)}
                            </p>
                        </div>
                    )}
                </div>

                {/* ══════════════════════════════════════════════════
                    BOUTON SOUMETTRE
                ══════════════════════════════════════════════════ */}
                <button
                    onClick={handleSubmit}
                    disabled={
                        submitting ||
                        !rccmNumber.trim() ||
                        !idPhoto ||
                        !managerName.trim() ||
                        !niuNumber.trim() ||
                        !address.trim()
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
