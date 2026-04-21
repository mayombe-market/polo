'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/app/components/Header'
import { Toaster, toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { DISPUTE_MOTIFS } from '@/lib/disputeMotifs'
import { sendRetourRequestEmail, sendRetourAckEmail } from '@/app/actions/emails'
import {
    ShieldCheck, PackageX, ChevronDown, ChevronLeft,
    ImagePlus, X, Loader2, CheckCircle2, Phone,
    Mail, User, Hash, MessageSquare, ChevronRight
} from 'lucide-react'

// ─── Politique de retour ────────────────────────────────────────────────────────
const POLICIES = [
    {
        icon: '📦',
        title: 'Produit endommagé ou incorrect',
        color: '#ef4444',
        text: 'Si le produit reçu est endommagé, défectueux ou ne correspond pas à votre commande, nous proposons un remboursement complet ou un échange sans complication.',
        badge: 'Remboursement garanti',
    },
    {
        icon: '🔄',
        title: 'Changement d\'avis',
        color: '#f97316',
        text: 'Si le produit ne correspond pas à vos attentes mais est en parfait état (non utilisé, emballage intact), nous offrons un échange contre un produit de valeur équivalente.',
        badge: 'Échange possible',
        note: 'Le produit doit être non utilisé, non lavé et dans son emballage d\'origine.',
    },
    {
        icon: '❌',
        title: 'Produits non éligibles',
        color: '#6b7280',
        text: 'Les produits périssables, personnalisés, sous-vêtements et articles d\'hygiène ne sont pas éligibles aux retours pour des raisons sanitaires.',
    },
    {
        icon: '⏱️',
        title: 'Délai de réclamation',
        color: '#3b82f6',
        text: 'Vous disposez de 48 heures après réception du colis pour signaler un problème. Passé ce délai, nous ne pourrons malheureusement plus traiter votre demande.',
        badge: 'Dans les 48h',
    },
    {
        icon: '🚚',
        title: 'Retour du produit',
        color: '#8b5cf6',
        text: 'Selon votre localisation, nous pouvons organiser la collecte du produit par notre équipe ou vous indiquer un point de dépôt. Les frais de retour sont à notre charge si la faute nous incombe.',
    },
]

function PolicyCard({ policy }: { policy: typeof POLICIES[0] }) {
    const [open, setOpen] = useState(false)
    return (
        <div
            className="rounded-2xl border transition-all overflow-hidden"
            style={{ borderColor: open ? policy.color + '40' : 'transparent', background: open ? policy.color + '05' : 'white' }}
        >
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
                <span className="text-2xl flex-shrink-0">{policy.icon}</span>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-sm dark:text-white">{policy.title}</p>
                    {policy.badge && !open && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full mt-1 inline-block"
                            style={{ background: policy.color + '15', color: policy.color }}>
                            {policy.badge}
                        </span>
                    )}
                </div>
                <ChevronDown size={16} className="flex-shrink-0 text-slate-400 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
            </button>
            {open && (
                <div className="px-5 pb-5 pl-[72px]">
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{policy.text}</p>
                    {policy.note && (
                        <div className="mt-3 text-xs italic text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border-l-2" style={{ borderColor: policy.color }}>
                            ⚠️ {policy.note}
                        </div>
                    )}
                    {policy.badge && (
                        <span className="mt-3 text-[10px] font-black uppercase px-3 py-1 rounded-full inline-block"
                            style={{ background: policy.color + '15', color: policy.color }}>
                            ✓ {policy.badge}
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── Page principale ────────────────────────────────────────────────────────────
export default function RetoursLitigesPage() {
    const { user, profile } = useAuth()
    const fileRef = useRef<HTMLInputElement>(null)

    // Form
    const [name, setName]         = useState('')
    const [email, setEmail]       = useState('')
    const [phone, setPhone]       = useState('')
    const [orderRef, setOrderRef] = useState('')
    const [motif, setMotif]       = useState('')
    const [description, setDesc]  = useState('')
    const [images, setImages]     = useState<string[]>([])
    const [uploading, setUploading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [done, setDone]         = useState(false)

    // Pré-remplir si connecté
    useEffect(() => {
        if (profile) {
            const n = (profile as any).full_name || `${(profile as any).first_name || ''} ${(profile as any).last_name || ''}`.trim()
            if (n) setName(n)
            if ((profile as any).phone) setPhone((profile as any).phone)
        }
        if (user?.email) setEmail(user.email)
    }, [user, profile])

    // Upload photo
    async function handleFiles(files: FileList | null) {
        if (!files || !files.length) return
        if (images.length + files.length > 4) { toast.error('Maximum 4 photos'); return }
        setUploading(true)
        for (const file of Array.from(files)) {
            if (!file.type.startsWith('image/')) continue
            try {
                const b64 = await new Promise<string>((res, rej) => {
                    const r = new FileReader()
                    r.onload = () => res(r.result as string)
                    r.onerror = rej
                    r.readAsDataURL(file)
                })
                const resp = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: b64 }),
                })
                const json = await resp.json()
                if (json.url) setImages(prev => [...prev, json.url])
                else throw new Error(json.error)
            } catch { toast.error(`Erreur upload : ${file.name}`) }
        }
        setUploading(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim()) { toast.error('Entrez votre nom'); return }
        if (!email.trim()) { toast.error('Entrez votre email'); return }
        if (!motif) { toast.error('Choisissez un motif'); return }

        setSubmitting(true)
        try {
            await Promise.all([
                sendRetourRequestEmail({ name, email, phone, orderRef, motif, description, images }),
                sendRetourAckEmail({ name, email, motif }),
            ])
            setDone(true)
        } catch {
            toast.error('Erreur lors de l\'envoi. Réessayez.')
        }
        setSubmitting(false)
    }

    return (
        <>
            <Header />
            <Toaster position="top-right" richColors closeButton />

            <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

                {/* ── Hero ──────────────────────────────────────────────── */}
                <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                    <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
                        <Link href="/" className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 hover:text-orange-500 transition-colors mb-6 no-underline">
                            <ChevronLeft size={13} /> Accueil
                        </Link>
                        <div className="flex items-start gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                                <PackageX size={26} className="text-orange-500" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter dark:text-white leading-none">
                                    Retours &amp; Litiges
                                </h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                                    Un problème avec votre commande ? Nous sommes là pour vous aider.
                                    Remplissez le formulaire ci-dessous, notre équipe vous répond sous <strong>24h</strong>.
                                </p>
                            </div>
                        </div>

                        {/* Garantie */}
                        <div className="mt-8 flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-2xl px-5 py-4">
                            <ShieldCheck size={20} className="text-green-500 flex-shrink-0" />
                            <p className="text-sm text-green-700 dark:text-green-300 leading-snug">
                                <strong>Protection acheteur Mayombe Market</strong> — Tous vos achats sont couverts.
                                Retour, échange ou remboursement selon les conditions ci-dessous.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

                    {/* ── Politique ─────────────────────────────────────── */}
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Notre politique de retour</p>
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                            {POLICIES.map((p, i) => (
                                <PolicyCard key={i} policy={p} />
                            ))}
                        </div>
                    </div>

                    {/* ── Formulaire ────────────────────────────────────── */}
                    {done ? (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-10 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={32} className="text-green-500" />
                            </div>
                            <h2 className="text-xl font-black uppercase italic dark:text-white mb-2">Demande envoyée !</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                                Votre réclamation a bien été transmise à notre équipe.<br />
                                Vous recevrez un email de confirmation sous peu.<br />
                                Nous vous recontacterons <strong>sous 24 à 48 heures</strong>.
                            </p>
                            <Link href="/" className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase italic text-[10px] transition-all no-underline">
                                Retour à l&apos;accueil
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Déposer une réclamation</p>

                            {/* ── Infos personnelles ── */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Vos coordonnées</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Nom */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">Nom complet *</label>
                                        <div className="relative">
                                            <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={e => setName(e.target.value)}
                                                placeholder="Jean Dupont"
                                                required
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-9 pr-4 py-3 text-sm dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-400 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">Email *</label>
                                        <div className="relative">
                                            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                placeholder="email@exemple.com"
                                                required
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-9 pr-4 py-3 text-sm dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-400 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {/* Téléphone */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">Téléphone</label>
                                        <div className="relative">
                                            <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={e => setPhone(e.target.value)}
                                                placeholder="+242 06 000 00 00"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-9 pr-4 py-3 text-sm dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-400 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {/* Numéro commande */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">Numéro de commande</label>
                                        <div className="relative">
                                            <Hash size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                value={orderRef}
                                                onChange={e => setOrderRef(e.target.value)}
                                                placeholder="Ex : MM-20240001"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-9 pr-4 py-3 text-sm dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-400 transition-colors font-mono"
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">Visible sur votre email de confirmation</p>
                                    </div>
                                </div>
                            </div>

                            {/* ── Motif ── */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">
                                    Motif de la réclamation *
                                </label>
                                <div className="relative">
                                    <select
                                        value={motif}
                                        onChange={e => setMotif(e.target.value)}
                                        required
                                        className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-4 text-sm dark:text-white focus:outline-none focus:border-orange-400 transition-colors cursor-pointer pr-10 font-bold"
                                        style={{ fontSize: '14px' }}
                                    >
                                        <option value="" disabled>Sélectionnez un motif...</option>
                                        {DISPUTE_MOTIFS.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                                {motif && (
                                    <div className="mt-3 flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl px-4 py-2.5">
                                        <CheckCircle2 size={14} className="text-orange-500 flex-shrink-0" />
                                        <span className="text-[12px] font-bold text-orange-700 dark:text-orange-300">{motif}</span>
                                    </div>
                                )}
                            </div>

                            {/* ── Description ── */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">
                                    <MessageSquare size={11} className="inline mr-1.5" />
                                    Description du problème
                                </label>
                                <textarea
                                    value={description}
                                    onChange={e => setDesc(e.target.value)}
                                    rows={5}
                                    placeholder="Décrivez le problème en détail : quand avez-vous reçu le colis ? Dans quel état était-il ? Qu'est-ce qui ne correspond pas ? Plus vous donnez de détails, plus nous pourrons traiter votre demande rapidement..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-400 transition-colors resize-none leading-relaxed"
                                />
                                <p className="text-[10px] text-slate-400 mt-2">{description.length} / 1000 caractères</p>
                            </div>

                            {/* ── Photos ── */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">
                                    Photos du problème (max 4) — fortement recommandé
                                </label>

                                {images.length < 4 && (
                                    <div
                                        onClick={() => fileRef.current?.click()}
                                        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
                                        onDragOver={e => e.preventDefault()}
                                        className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-orange-400 rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all"
                                    >
                                        {uploading ? (
                                            <>
                                                <Loader2 size={28} className="animate-spin text-orange-500" />
                                                <p className="text-[11px] font-bold text-slate-400 uppercase">Upload en cours...</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                    <ImagePlus size={24} className="text-slate-400" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[12px] font-black uppercase text-slate-500">Ajouter des photos</p>
                                                    <p className="text-[10px] text-slate-400 mt-1">Glissez ici ou cliquez — JPG, PNG — max 4 photos</p>
                                                    <p className="text-[10px] text-orange-500 font-bold mt-1">Les photos accélèrent le traitement de votre dossier</p>
                                                </div>
                                            </>
                                        )}
                                        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
                                    </div>
                                )}

                                {images.length > 0 && (
                                    <div className="flex flex-wrap gap-3 mt-4">
                                        {images.map((url, i) => (
                                            <div key={i} className="relative w-24 h-24">
                                                <img src={url} alt="" className="w-24 h-24 rounded-2xl object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                        {images.length < 4 && (
                                            <button
                                                type="button"
                                                onClick={() => fileRef.current?.click()}
                                                className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-orange-400 flex items-center justify-center transition-colors"
                                            >
                                                <ImagePlus size={20} className="text-slate-300" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ── Submit ── */}
                            <button
                                type="submit"
                                disabled={submitting || !motif || !name || !email}
                                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-5 rounded-2xl font-black uppercase italic text-[12px] flex items-center justify-center gap-3 transition-all shadow-xl shadow-orange-500/20 text-lg"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Envoi en cours...
                                    </>
                                ) : (
                                    <>
                                        <PackageX size={18} />
                                        Envoyer ma réclamation
                                        <ChevronRight size={18} />
                                    </>
                                )}
                            </button>

                            <p className="text-[10px] text-slate-400 text-center pb-6">
                                En soumettant ce formulaire, vous confirmez que les informations sont exactes.
                                Vous recevrez un accusé de réception par email.
                            </p>
                        </form>
                    )}

                </div>
            </div>
        </>
    )
}
