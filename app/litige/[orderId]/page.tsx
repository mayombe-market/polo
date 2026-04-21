'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/app/components/Header'
import { Toaster, toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { DISPUTE_MOTIFS } from '@/lib/disputeMotifs'
import { createDispute, getDisputeByOrder } from '@/app/actions/disputes'
import {
    ShieldCheck, AlertTriangle, CheckCircle2, XCircle,
    Clock, ChevronLeft, Upload, X, Loader2, ImagePlus,
    PackageX
} from 'lucide-react'

// ─── Statut badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; bg: string; text: string; icon: any }> = {
        pending:  { label: 'En attente',  bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', icon: Clock },
        accepted: { label: 'Acceptée',    bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-400',  icon: CheckCircle2 },
        rejected: { label: 'Refusée',     bg: 'bg-red-100 dark:bg-red-900/30',      text: 'text-red-700 dark:text-red-400',      icon: XCircle },
        resolved: { label: 'Résolue',     bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-700 dark:text-blue-400',    icon: CheckCircle2 },
    }
    const s = map[status] || map.pending
    const Icon = s.icon
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${s.bg} ${s.text}`}>
            <Icon size={11} />
            {s.label}
        </span>
    )
}

// ─── Page principale ───────────────────────────────────────────────────────────
export default function LitigePage() {
    const params = useParams()
    const router = useRouter()
    const orderId = params.orderId as string
    const { user, profile, loading: authLoading } = useAuth()

    const [phase, setPhase] = useState<'loading' | 'form' | 'existing' | 'success' | 'forbidden'>('loading')
    const [existingDispute, setExistingDispute] = useState<any>(null)
    const [motif, setMotif] = useState('')
    const [description, setDescription] = useState('')
    const [images, setImages] = useState<string[]>([])       // URLs Cloudinary
    const [uploading, setUploading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    // ── Auth redirect ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!authLoading && !user) {
            router.replace(`/login?redirect=/litige/${orderId}`)
        }
    }, [authLoading, user, orderId, router])

    // ── Check existing dispute ─────────────────────────────────────────────────
    useEffect(() => {
        if (!user || !orderId) return
        getDisputeByOrder(orderId).then(({ data }) => {
            if (data) {
                setExistingDispute(data)
                setPhase('existing')
            } else {
                setPhase('form')
            }
        })
    }, [user, orderId])

    // ── Upload images ──────────────────────────────────────────────────────────
    async function handleImageFiles(files: FileList | null) {
        if (!files || files.length === 0) return
        if (images.length + files.length > 4) {
            toast.error('Maximum 4 photos autorisées')
            return
        }
        setUploading(true)
        const uploaded: string[] = []
        for (const file of Array.from(files)) {
            if (!file.type.startsWith('image/')) continue
            try {
                const b64 = await fileToBase64(file)
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: b64 }),
                })
                const json = await res.json()
                if (json.url) uploaded.push(json.url)
                else throw new Error(json.error || 'Upload failed')
            } catch {
                toast.error(`Erreur upload : ${file.name}`)
            }
        }
        setImages(prev => [...prev, ...uploaded])
        setUploading(false)
    }

    function fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(file)
        })
    }

    // ── Submit ─────────────────────────────────────────────────────────────────
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!motif) { toast.error('Choisissez un motif'); return }
        setSubmitting(true)
        const result = await createDispute({ orderId, motif, description, images })
        setSubmitting(false)
        if (result.error) {
            toast.error(result.error)
        } else {
            setPhase('success')
        }
    }

    // ── Drag & drop ────────────────────────────────────────────────────────────
    function handleDrop(e: React.DragEvent) {
        e.preventDefault()
        handleImageFiles(e.dataTransfer.files)
    }

    if (authLoading || phase === 'loading') {
        return (
            <div className="min-h-screen dark:bg-slate-950 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-orange-500" />
            </div>
        )
    }

    return (
        <>
            <Header />
            <Toaster position="top-right" richColors closeButton />

            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4">
                <div className="max-w-xl mx-auto">

                    {/* Back */}
                    <Link href="/account/dashboard" className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-orange-500 transition-colors mb-6 no-underline">
                        <ChevronLeft size={14} />
                        Retour à mes commandes
                    </Link>

                    {/* ── LITIGE EXISTANT ─────────────────────────────────────── */}
                    {phase === 'existing' && existingDispute && (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={28} className="text-orange-500" />
                            </div>
                            <h1 className="text-xl font-black uppercase italic dark:text-white mb-2">Réclamation existante</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                Vous avez déjà ouvert une réclamation pour cette commande.
                            </p>

                            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 text-left space-y-3 mb-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase text-slate-400">Statut</span>
                                    <StatusBadge status={existingDispute.status} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Motif</span>
                                    <span className="text-sm font-bold dark:text-white">{existingDispute.motif}</span>
                                </div>
                                {existingDispute.admin_note && (
                                    <div>
                                        <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Réponse de l&apos;équipe</span>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{existingDispute.admin_note}</p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Date</span>
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                        {new Date(existingDispute.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>

                            {existingDispute.status === 'pending' && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-2xl p-4 text-sm text-yellow-700 dark:text-yellow-300">
                                    ⏳ Votre réclamation est en cours d&apos;examen. Notre équipe vous contactera très prochainement.
                                </div>
                            )}
                            {existingDispute.status === 'accepted' && (
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-2xl p-4 text-sm text-green-700 dark:text-green-300">
                                    ✅ Réclamation acceptée — Notre équipe va vous contacter pour finaliser le retour.
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── SUCCÈS ──────────────────────────────────────────────── */}
                    {phase === 'success' && (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={28} className="text-green-500" />
                            </div>
                            <h1 className="text-xl font-black uppercase italic dark:text-white mb-2">Réclamation envoyée !</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                Votre dossier a bien été transmis à notre équipe.<br/>
                                Nous vous contacterons dans les <strong>24 à 48 heures</strong>.
                            </p>
                            <Link
                                href="/account/dashboard"
                                className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase italic text-[10px] transition-all no-underline"
                            >
                                Retour à mes commandes
                            </Link>
                        </div>
                    )}

                    {/* ── FORMULAIRE ──────────────────────────────────────────── */}
                    {phase === 'form' && (
                        <form onSubmit={handleSubmit} className="space-y-5">

                            {/* Politique de retour */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                                        <ShieldCheck size={18} className="text-green-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black uppercase italic dark:text-white">Politique de retour</h2>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Vos droits chez Mayombe Market</p>
                                    </div>
                                </div>
                                <div className="space-y-2.5 text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
                                    <p>
                                        ✅ Vous pouvez signaler un problème sur votre commande en toute tranquillité.<br/>
                                        Notre équipe examine chaque dossier avec soin et impartialité.
                                    </p>
                                    <p className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-[12px]">
                                        📋 <strong>Conditions :</strong> le produit doit être dans son état d&apos;origine — non utilisé, non endommagé de votre fait, propre, avec tous ses accessoires. Si le colis a été ouvert, il doit l&apos;être soigneusement.
                                    </p>
                                    <p>
                                        📸 Des photos du produit et de l&apos;emballage facilitent et accélèrent le traitement de votre dossier.
                                    </p>
                                </div>
                            </div>

                            {/* Motif */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Motif de la réclamation *</h3>
                                <div className="space-y-2">
                                    {DISPUTE_MOTIFS.map(m => (
                                        <label key={m} className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${motif === m ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-transparent bg-slate-50 dark:bg-slate-800 hover:border-orange-200'}`}>
                                            <input
                                                type="radio"
                                                name="motif"
                                                value={m}
                                                checked={motif === m}
                                                onChange={() => setMotif(m)}
                                                className="hidden"
                                            />
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${motif === m ? 'border-orange-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                                {motif === m && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                                            </div>
                                            <span className={`text-[12px] font-bold leading-snug ${motif === m ? 'text-orange-700 dark:text-orange-300' : 'text-slate-700 dark:text-slate-200'}`}>{m}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">
                                    Description (optionnel)
                                </label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Décrivez le problème en détail : date de réception, état du colis, ce qui ne correspond pas..."
                                    rows={4}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-400 transition-colors resize-none"
                                />
                            </div>

                            {/* Photos */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">
                                    Photos (max 4) — recommandé
                                </h3>

                                {/* Zone drag & drop */}
                                {images.length < 4 && (
                                    <div
                                        onClick={() => fileRef.current?.click()}
                                        onDrop={handleDrop}
                                        onDragOver={e => e.preventDefault()}
                                        className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-orange-400 rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors"
                                    >
                                        {uploading ? (
                                            <>
                                                <Loader2 size={28} className="animate-spin text-orange-500" />
                                                <p className="text-[11px] font-bold text-slate-400 uppercase">Upload en cours...</p>
                                            </>
                                        ) : (
                                            <>
                                                <ImagePlus size={28} className="text-slate-300" />
                                                <p className="text-[11px] font-bold text-slate-400 uppercase text-center">
                                                    Cliquez ou glissez vos photos ici<br/>
                                                    <span className="text-[10px] font-normal normal-case text-slate-300">JPG, PNG — max 4 photos</span>
                                                </p>
                                            </>
                                        )}
                                        <input
                                            ref={fileRef}
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            className="hidden"
                                            onChange={e => handleImageFiles(e.target.files)}
                                        />
                                    </div>
                                )}

                                {/* Thumbnails */}
                                {images.length > 0 && (
                                    <div className="flex flex-wrap gap-3 mt-4">
                                        {images.map((url, i) => (
                                            <div key={i} className="relative w-20 h-20">
                                                <img src={url} alt="" className="w-20 h-20 rounded-xl object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={submitting || !motif}
                                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-black uppercase italic text-[11px] flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Envoi en cours...
                                    </>
                                ) : (
                                    <>
                                        <PackageX size={16} />
                                        Envoyer ma réclamation
                                    </>
                                )}
                            </button>

                            <p className="text-[10px] text-slate-400 text-center pb-8">
                                En soumettant ce formulaire, vous confirmez que les informations fournies sont exactes.
                            </p>
                        </form>
                    )}

                </div>
            </div>
        </>
    )
}
