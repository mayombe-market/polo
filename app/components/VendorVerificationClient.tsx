'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Shield, Upload, Camera, CreditCard, CheckCircle, Clock, XCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { submitVerification } from '@/app/actions/verifications'

interface Props {
    user: any
    profile: any
    existingVerification: any
}

/** Bucket + chemin verifications/{userId}/… — aligné sur supabase-vendors-storage-and-profiles-unlock.sql */
const BUCKET = 'vendor-verifications'

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

export default function VendorVerificationClient({ user, profile, existingVerification }: Props) {
    const router = useRouter()
    const supabase = getSupabaseBrowserClient()
    const status = profile?.verification_status || 'unverified'

    // Formulaire
    const [shopPhoto, setShopPhoto] = useState<File | null>(null)
    const [shopPhotoPreview, setShopPhotoPreview] = useState<string | null>(null)
    const [cniPhoto, setCniPhoto] = useState<File | null>(null)
    const [cniPhotoPreview, setCniPhotoPreview] = useState<string | null>(null)
    const [cniName, setCniName] = useState('')
    const [momoName, setMomoName] = useState('')
    const [momoNumber, setMomoNumber] = useState('')
    const [momoOperator, setMomoOperator] = useState<'MTN' | 'Airtel'>('MTN')
    const [submitting, setSubmitting] = useState(false)

    const handleFileSelect = (file: File, type: 'shop' | 'cni') => {
        if (file.size > 5 * 1024 * 1024) {
            toast.error('La photo ne doit pas dépasser 5 Mo')
            return
        }
        if (!file.type.startsWith('image/')) {
            toast.error('Seules les images sont acceptées')
            return
        }

        const preview = URL.createObjectURL(file)
        if (type === 'shop') {
            setShopPhoto(file)
            setShopPhotoPreview(preview)
        } else {
            setCniPhoto(file)
            setCniPhotoPreview(preview)
        }
    }

    const uploadImage = async (file: File, basePath: string): Promise<string | null> => {
        const ext = extFromFile(file)
        const path = `${basePath}.${ext}`
        const contentType = contentTypeForFile(file, ext)

        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
            contentType,
            upsert: true,
        })

        if (error) {
            console.error('DEBUG UPLOAD:', error)
            toast.error(
                error.message.includes('Bucket not found')
                    ? 'Bucket Storage « vendor-verifications » manquant. Exécutez supabase-vendors-storage-and-profiles-unlock.sql dans Supabase.'
                    : `Upload : ${error.message}`
            )
            return null
        }

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
        return data.publicUrl
    }

    const handleSubmit = async () => {
        if (!shopPhoto || !cniPhoto) {
            toast.error('Les deux photos sont obligatoires')
            return
        }
        if (!cniName.trim() || !momoName.trim()) {
            toast.error('Les noms CNI et Mobile Money sont obligatoires')
            return
        }
        const momoDigits = momoNumber.replace(/\D/g, '')
        if (momoDigits.length !== 9) {
            toast.error('Le numéro Mobile Money doit contenir 9 chiffres (sans +242)')
            return
        }

        setSubmitting(true)
        try {
            const timestamp = Date.now()

            // Upload les 2 photos (bucket dédié KYC + contentType explicite)
            const shopPhotoUrl = await uploadImage(shopPhoto, `verifications/${user.id}/${timestamp}-shop`)
            const cniPhotoUrl = await uploadImage(cniPhoto, `verifications/${user.id}/${timestamp}-cni`)

            if (!shopPhotoUrl || !cniPhotoUrl) {
                console.error('DEBUG UPLOAD:', { shopPhotoUrl, cniPhotoUrl, hint: 'upload a retourné null (voir logs upload ci-dessus)' })
                toast.error('Erreur lors de l\'upload des photos. Réessayez.')
                return
            }

            const result = await submitVerification({
                shopPhotoUrl,
                cniPhotoUrl,
                cniName: cniName.trim(),
                momoName: momoName.trim(),
                momoNumber: momoDigits,
                momoOperator,
            })

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Demande de vérification envoyée !')
                router.refresh()
            }
        } catch {
            toast.error('Une erreur est survenue')
        } finally {
            setSubmitting(false)
        }
    }

    // ═══ SI DEJA VERIFIE ═══
    if (status === 'verified') {
        return (
            <div className="max-w-lg mx-auto px-4 py-16 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <CheckCircle size={40} className="text-green-500" />
                </div>
                <h1 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white mb-2">
                    Compte vérifié
                </h1>
                <p className="text-sm text-slate-400 mb-6">
                    Votre identité a été vérifiée. Vous pouvez publier vos produits librement.
                </p>
                <Link
                    href="/vendor/dashboard"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 transition-colors no-underline"
                >
                    <ArrowLeft size={16} />
                    Retour au dashboard
                </Link>
            </div>
        )
    }

    // ═══ SI EN ATTENTE ═══
    if (status === 'pending') {
        return (
            <div className="max-w-lg mx-auto px-4 py-16 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <Clock size={40} className="text-blue-500" />
                </div>
                <h1 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white mb-2">
                    Vérification en cours
                </h1>
                <p className="text-sm text-slate-400 mb-2">
                    Notre équipe examine votre dossier. Cela prend généralement 24 à 48 heures.
                </p>
                <p className="text-xs text-slate-400 mb-6">
                    Vous recevrez une notification dès que votre compte sera vérifié.
                </p>

                {/* Résumé de la soumission */}
                {existingVerification && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 text-left mb-6">
                        <h3 className="text-xs font-bold uppercase text-slate-400 mb-3">Votre soumission</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 mb-1">Photo boutique</p>
                                <div className="relative w-full aspect-video rounded-xl overflow-hidden">
                                    <Image src={existingVerification.shop_photo_url} alt="Boutique" fill className="object-cover" unoptimized />
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 mb-1">Photo CNI</p>
                                <div className="relative w-full aspect-video rounded-xl overflow-hidden">
                                    <Image src={existingVerification.cni_photo_url} alt="CNI" fill className="object-cover" unoptimized />
                                </div>
                            </div>
                        </div>
                        <div className="mt-3 space-y-1 text-xs">
                            <p><span className="text-slate-400">Nom CNI :</span> <span className="font-bold dark:text-white">{existingVerification.cni_name}</span></p>
                            <p><span className="text-slate-400">Nom MoMo :</span> <span className="font-bold dark:text-white">{existingVerification.momo_name}</span></p>
                            <p><span className="text-slate-400">Numéro :</span> <span className="font-bold dark:text-white">{existingVerification.momo_number} ({existingVerification.momo_operator})</span></p>
                        </div>
                    </div>
                )}

                <Link
                    href="/vendor/dashboard"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-sm hover:bg-slate-300 transition-colors no-underline"
                >
                    <ArrowLeft size={16} />
                    Retour au dashboard
                </Link>
            </div>
        )
    }

    // ═══ FORMULAIRE (unverified ou rejected) ═══
    return (
        <div className="max-w-lg mx-auto px-4 py-8">
            {/* Header */}
            <Link href="/vendor/dashboard" className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 mb-6 no-underline">
                <ArrowLeft size={14} />
                Retour au dashboard
            </Link>

            <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <Shield size={28} className="text-white" />
                </div>
                <h1 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white mb-1">
                    Vérification vendeur
                </h1>
                <p className="text-xs text-slate-400">
                    Vérifiez votre identité pour pouvoir publier vos produits
                </p>
            </div>

            {/* Message de rejet si applicable */}
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
                {/* ═══ Photo dans la boutique ═══ */}
                <div>
                    <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                        <Camera size={14} />
                        Photo de vous dans votre boutique
                    </label>
                    <div
                        className={`relative w-full aspect-video rounded-2xl border-2 border-dashed overflow-hidden cursor-pointer transition-colors ${
                            shopPhotoPreview
                                ? 'border-green-300 dark:border-green-700'
                                : 'border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700'
                        }`}
                        onClick={() => document.getElementById('shop-photo-input')?.click()}
                    >
                        {shopPhotoPreview ? (
                            <Image src={shopPhotoPreview} alt="Preview" fill className="object-cover" unoptimized />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                <Upload size={28} className="mb-2" />
                                <p className="text-xs font-bold">Cliquez pour ajouter</p>
                                <p className="text-[10px]">JPG, PNG — max 5 Mo</p>
                            </div>
                        )}
                    </div>
                    <input
                        id="shop-photo-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'shop')}
                    />
                </div>

                {/* ═══ Photo CNI ═══ */}
                <div>
                    <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                        <CreditCard size={14} />
                        Photo de votre CNI (recto)
                    </label>
                    <div
                        className={`relative w-full aspect-video rounded-2xl border-2 border-dashed overflow-hidden cursor-pointer transition-colors ${
                            cniPhotoPreview
                                ? 'border-green-300 dark:border-green-700'
                                : 'border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700'
                        }`}
                        onClick={() => document.getElementById('cni-photo-input')?.click()}
                    >
                        {cniPhotoPreview ? (
                            <Image src={cniPhotoPreview} alt="Preview" fill className="object-cover" unoptimized />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                <Upload size={28} className="mb-2" />
                                <p className="text-xs font-bold">Cliquez pour ajouter</p>
                                <p className="text-[10px]">JPG, PNG — max 5 Mo</p>
                            </div>
                        )}
                    </div>
                    <input
                        id="cni-photo-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'cni')}
                    />
                </div>

                {/* ═══ Nom sur la CNI ═══ */}
                <div>
                    <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2 block">
                        Nom complet sur la CNI
                    </label>
                    <input
                        type="text"
                        value={cniName}
                        onChange={(e) => setCniName(e.target.value)}
                        placeholder="Ex: MBOUNGOU Jean-Pierre"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                </div>

                {/* ═══ Nom Mobile Money ═══ */}
                <div>
                    <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2 block">
                        Nom sur le compte Mobile Money
                    </label>
                    <input
                        type="text"
                        value={momoName}
                        onChange={(e) => setMomoName(e.target.value)}
                        placeholder="Ex: MBOUNGOU Jean-Pierre"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                    {cniName && momoName && cniName.trim().toLowerCase() !== momoName.trim().toLowerCase() && (
                        <p className="text-[10px] font-bold text-amber-500 mt-1">
                            ⚠️ Le nom CNI et le nom Mobile Money ne correspondent pas
                        </p>
                    )}
                </div>

                {/* ═══ Opérateur ═══ */}
                <div>
                    <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2 block">
                        Opérateur Mobile Money
                    </label>
                    <div className="flex gap-3">
                        {(['MTN', 'Airtel'] as const).map((op) => (
                            <button
                                key={op}
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
                </div>

                {/* ═══ Numéro Mobile Money ═══ */}
                <div>
                    <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2 block">
                        Numéro Mobile Money
                    </label>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-400 px-3 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                            +242
                        </span>
                        <input
                            type="tel"
                            value={momoNumber}
                            onChange={(e) => setMomoNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                            placeholder="XX XXX XXXX"
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                        />
                    </div>
                </div>

                {/* ═══ Bouton soumettre ═══ */}
                <button
                    onClick={handleSubmit}
                    disabled={submitting || !shopPhoto || !cniPhoto || !cniName.trim() || !momoName.trim() || !momoNumber.trim()}
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
