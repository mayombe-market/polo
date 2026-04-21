'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
    X, Megaphone, Zap, LayoutGrid, ChevronRight,
    ChevronLeft, Check, Loader2, Calendar, ImageIcon, Upload
} from 'lucide-react'
import { toast } from 'sonner'
import {
    HERO_PRICES_FCFA, TILE_PRICES_FCFA,
    type AdPlacement, type AdDurationDays, MAX_HERO_SLIDES,
} from '@/lib/adCampaignPricing'
import { getAdminPaymentNumber } from '@/lib/adminPaymentConfig'
import { getHeroSlotsByDay, submitVendorAdCampaignWithPayment } from '@/app/actions/vendorAdCampaigns'

const DURATIONS: AdDurationDays[] = [3, 7, 14, 30]

type Props = {
    productId: string
    productName: string
    productImages: string[]   // mainUrl + galleryUrls déjà uploadés
    onClose: () => void
    onSuccess: () => void     // redirige vers dashboard
}

export default function AdCampaignModal({ productId, productName, productImages, onClose, onSuccess }: Props) {
    const [step, setStep] = useState<0 | 1 | 2 | 3 | 4 | 5>(0)

    // Step 1 — placement
    const [placement, setPlacement] = useState<AdPlacement | null>(null)

    // Step 2 — image + commentaire
    const [selectedImg, setSelectedImg] = useState<string>(productImages[0] || '')
    const [customImgFile, setCustomImgFile] = useState<File | null>(null)
    const [customImgPreview, setCustomImgPreview] = useState<string | null>(null)
    const [uploadingCustom, setUploadingCustom] = useState(false)
    const [uploadedCustomUrl, setUploadedCustomUrl] = useState<string | null>(null)
    const [comment, setComment] = useState('')

    // Step 3 — durée + calendrier
    const [duration, setDuration] = useState<AdDurationDays | null>(null)
    const [startDate, setStartDate] = useState<string>('')           // 'YYYY-MM-DD'
    const [heroSlots, setHeroSlots] = useState<Record<string, number>>({})
    const [slotsLoading, setSlotsLoading] = useState(false)
    const [suggestedDate, setSuggestedDate] = useState<string>('')

    // Step 5 — paiement
    const [payMethod, setPayMethod] = useState<'mobile_money' | 'airtel_money'>('mobile_money')
    const [txCode, setTxCode] = useState('')
    const [txError, setTxError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Calendar nav
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const [calMonth, setCalMonth] = useState(today.getMonth())
    const [calYear, setCalYear] = useState(today.getFullYear())

    const fmt = (n: number) => n.toLocaleString('fr-FR')
    const price = placement && duration ? (placement === 'hero' ? HERO_PRICES_FCFA[duration] : TILE_PRICES_FCFA[duration]) : 0
    const momoNumber = getAdminPaymentNumber(null, payMethod)

    const finalImgUrl = uploadedCustomUrl || selectedImg

    // Charger les slots Hero quand on arrive à l'étape calendar
    useEffect(() => {
        if (step !== 3 || placement !== 'hero') return
        setSlotsLoading(true)
        getHeroSlotsByDay().then((res) => {
            setSlotsLoading(false)
            if (res.ok) {
                setHeroSlots(res.slots)
                // Trouver la première date disponible
                const d = new Date(today)
                for (let i = 0; i < 90; i++) {
                    const key = d.toISOString().slice(0, 10)
                    if ((res.slots[key] || 0) < MAX_HERO_SLIDES) {
                        setSuggestedDate(key)
                        if (!startDate) setStartDate(key)
                        break
                    }
                    d.setDate(d.getDate() + 1)
                }
            }
        })
    }, [step, placement])

    const isDayBlocked = useCallback((dateStr: string) => {
        if (placement !== 'hero') return false
        return (heroSlots[dateStr] || 0) >= MAX_HERO_SLIDES
    }, [heroSlots, placement])

    // Générer le calendrier du mois
    const buildCalendar = () => {
        const firstDay = new Date(calYear, calMonth, 1).getDay() // 0=dim
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
        const cells: (string | null)[] = Array(firstDay === 0 ? 6 : firstDay - 1).fill(null)
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(calYear, calMonth, d)
            cells.push(date.toISOString().slice(0, 10))
        }
        return cells
    }

    const endDate = startDate && duration
        ? (() => { const d = new Date(startDate); d.setDate(d.getDate() + duration); return d.toISOString().slice(0, 10) })()
        : null

    const handleCustomImg = async (file: File) => {
        setCustomImgFile(file)
        setCustomImgPreview(URL.createObjectURL(file))
        setUploadingCustom(true)
        try {
            const reader = new FileReader()
            const dataUri = await new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(file)
            })
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: dataUri }),
            })
            const json = await res.json()
            if (json.url) {
                setUploadedCustomUrl(json.url)
                setSelectedImg(json.url)
            } else {
                toast.error("Échec de l'upload. Réessayez.")
            }
        } catch {
            toast.error("Erreur lors de l'upload.")
        } finally {
            setUploadingCustom(false)
        }
    }

    const txDigits = txCode.replace(/\D/g, '')
    const txComplete = txDigits.length === 10
    const fmtTx = (v: string) => v.replace(/\D/g, '').slice(0, 10).replace(/(\d{3})(?=\d)/g, '$1 ')

    const handlePay = async () => {
        if (!txComplete) { setTxError('Le code doit contenir exactement 10 chiffres'); return }
        if (!placement || !duration || !finalImgUrl) return
        setTxError('')
        setSubmitting(true)
        const res = await submitVendorAdCampaignWithPayment({
            linkUrl: `/product/${productId}`,
            linkType: 'product',
            imageUrl: finalImgUrl,
            title: productName,
            description: comment.trim() || undefined,
            placement,
            durationDays: duration,
            payment_method: payMethod,
            transaction_id: txDigits,
            preferred_start_date: startDate || null,
        })
        setSubmitting(false)
        if (res.error) { toast.error(res.error); return }
        toast.success('Campagne soumise ! L\'admin valide sous peu.')
        onSuccess()
    }

    const canGoNext = () => {
        if (step === 1) return !!placement
        if (step === 2) return !!finalImgUrl && !uploadingCustom
        if (step === 3) return !!duration && !!startDate && !isDayBlocked(startDate)
        return true
    }

    const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    const DAY_NAMES = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']

    const modal = (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step === 0 ? onClose : undefined} />
            <div
                className="relative bg-white dark:bg-slate-900 w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 sticky top-0 bg-white dark:bg-slate-900 z-10 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center">
                            <Megaphone size={15} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-orange-500 tracking-widest">Mayombe Market</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase truncate max-w-[200px]">Publicité produit</p>
                        </div>
                    </div>
                    {/* Steps dots */}
                    {step > 0 && (
                        <div className="flex items-center gap-1.5">
                            {([1, 2, 3, 4, 5] as const).map(s => (
                                <div key={s} className={`w-1.5 h-1.5 rounded-full transition-all ${s === step ? 'bg-orange-500 w-4' : s < step ? 'bg-orange-300' : 'bg-slate-200 dark:bg-slate-700'}`} />
                            ))}
                        </div>
                    )}
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-lg transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="px-6 py-6">

                    {/* ── ÉTAPE 0 : Pub ou pas ? ── */}
                    {step === 0 && (
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-500/10 border-2 border-orange-200 dark:border-orange-500/20 flex items-center justify-center mx-auto mb-5">
                                <Megaphone size={28} className="text-orange-500" />
                            </div>
                            <h2 className="text-xl font-black uppercase italic tracking-tighter mb-2">
                                Produit publié ! 🎉
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 font-medium">
                                <span className="font-black text-slate-700 dark:text-slate-200">{productName}</span> est maintenant en ligne.
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                                Voulez-vous le mettre en publicité pour augmenter sa visibilité ?
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={onSuccess}
                                    className="flex flex-col items-center gap-2 px-4 py-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 transition-all text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                >
                                    <Check size={22} className="text-slate-400" />
                                    <span className="text-xs font-black uppercase">Non merci</span>
                                    <span className="text-[10px] text-slate-400">Publier simplement</span>
                                </button>
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex flex-col items-center gap-2 px-4 py-5 rounded-2xl bg-orange-500 hover:bg-orange-600 transition-all text-white shadow-lg shadow-orange-500/25"
                                >
                                    <Megaphone size={22} />
                                    <span className="text-xs font-black uppercase">Oui, créer une pub</span>
                                    <span className="text-[10px] text-orange-200">Plus de visibilité</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── ÉTAPE 1 : Choix placement ── */}
                    {step === 1 && (
                        <div>
                            <h2 className="text-lg font-black uppercase italic tracking-tighter mb-1">Où afficher votre pub ?</h2>
                            <p className="text-[11px] text-slate-400 mb-5">Choisissez l&apos;emplacement le plus adapté à votre budget.</p>
                            <div className="space-y-3 mb-6">
                                {/* Hero */}
                                <button
                                    onClick={() => setPlacement('hero')}
                                    className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all ${placement === 'hero' ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/5' : 'border-slate-200 dark:border-slate-700 hover:border-orange-300'}`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${placement === 'hero' ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                        <Zap size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-black uppercase">Hero Carousel</span>
                                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">Meilleure visibilité</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Grande bannière en haut de la page d&apos;accueil. Vue par tous les visiteurs dès leur arrivée sur le site.</p>
                                        <p className="text-[10px] font-black text-orange-500 mt-1.5">À partir de {fmt(HERO_PRICES_FCFA[3])} FCFA</p>
                                    </div>
                                    {placement === 'hero' && <Check size={18} className="text-orange-500 shrink-0 mt-1" />}
                                </button>
                                {/* Tile */}
                                <button
                                    onClick={() => setPlacement('tile')}
                                    className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all ${placement === 'tile' ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/5' : 'border-slate-200 dark:border-slate-700 hover:border-orange-300'}`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${placement === 'tile' ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                        <LayoutGrid size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-black uppercase">Vignette Tile</span>
                                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">Bon rapport qualité/prix</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Vignette affichée sous le carousel principal. Idéal pour une visibilité continue à petit budget.</p>
                                        <p className="text-[10px] font-black text-orange-500 mt-1.5">À partir de {fmt(TILE_PRICES_FCFA[3])} FCFA</p>
                                    </div>
                                    {placement === 'tile' && <Check size={18} className="text-orange-500 shrink-0 mt-1" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── ÉTAPE 2 : Image + commentaire ── */}
                    {step === 2 && (
                        <div>
                            <h2 className="text-lg font-black uppercase italic tracking-tighter mb-1">Image de votre pub</h2>
                            <p className="text-[11px] text-slate-400 mb-1">
                                Sélectionnez une de vos images ou uploadez-en une nouvelle.
                            </p>
                            <p className="text-[10px] text-slate-400 mb-4">
                                Dimensions recommandées : {placement === 'hero' ? '1200 × 400 px (paysage)' : '600 × 600 px (carré)'}
                            </p>

                            {/* Grille images produit */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {productImages.map((url, i) => (
                                    <button
                                        key={url}
                                        onClick={() => { setSelectedImg(url); setUploadedCustomUrl(null); setCustomImgPreview(null) }}
                                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${(uploadedCustomUrl ? uploadedCustomUrl === url : selectedImg === url) && !customImgPreview ? 'border-orange-500 shadow-md shadow-orange-500/20' : 'border-slate-200 dark:border-slate-700'}`}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={url} alt={`img-${i}`} className="w-full h-full object-cover" />
                                        {(uploadedCustomUrl ? uploadedCustomUrl === url : selectedImg === url) && !customImgPreview && (
                                            <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                                                <Check size={20} className="text-orange-500 drop-shadow" />
                                            </div>
                                        )}
                                    </button>
                                ))}

                                {/* Bouton upload custom */}
                                <label className={`relative aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${customImgPreview ? 'border-orange-500' : 'border-slate-300 dark:border-slate-600 hover:border-orange-400'}`}>
                                    {uploadingCustom ? (
                                        <Loader2 size={20} className="text-orange-500 animate-spin" />
                                    ) : customImgPreview ? (
                                        <>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={customImgPreview} alt="custom" className="w-full h-full object-cover rounded-xl" />
                                            {uploadedCustomUrl && <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center rounded-xl"><Check size={20} className="text-orange-500" /></div>}
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={18} className="text-slate-400" />
                                            <span className="text-[9px] font-bold text-slate-400 uppercase text-center">Autre image</span>
                                        </>
                                    )}
                                    <input
                                        type="file" accept="image/*" className="hidden"
                                        onChange={e => { const f = e.target.files?.[0]; if (f) handleCustomImg(f) }}
                                    />
                                </label>
                            </div>

                            {/* Commentaire */}
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-2">
                                    Commentaire / Slogan <span className="text-slate-300">(optionnel)</span>
                                </label>
                                <textarea
                                    value={comment}
                                    onChange={e => setComment(e.target.value)}
                                    placeholder="Ex : Nouveau stock disponible ! Livraison rapide…"
                                    maxLength={120}
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-orange-400 resize-none transition-colors placeholder:text-slate-400"
                                />
                                <p className="text-right text-[9px] text-slate-400 mt-1">{comment.length}/120</p>
                            </div>
                        </div>
                    )}

                    {/* ── ÉTAPE 3 : Durée + Calendrier ── */}
                    {step === 3 && (
                        <div>
                            <h2 className="text-lg font-black uppercase italic tracking-tighter mb-1">Durée & Date de début</h2>
                            <p className="text-[11px] text-slate-400 mb-5">Choisissez la durée puis votre date de départ.</p>

                            {/* Grille durées */}
                            <div className="grid grid-cols-4 gap-2 mb-6">
                                {DURATIONS.map(d => {
                                    const p = placement === 'hero' ? HERO_PRICES_FCFA[d] : TILE_PRICES_FCFA[d]
                                    return (
                                        <button
                                            key={d}
                                            onClick={() => setDuration(d)}
                                            className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all ${duration === d ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/5' : 'border-slate-200 dark:border-slate-700 hover:border-orange-300'}`}
                                        >
                                            <span className={`text-sm font-black ${duration === d ? 'text-orange-500' : 'text-slate-700 dark:text-slate-200'}`}>{d}j</span>
                                            <span className="text-[9px] font-bold text-slate-400 mt-0.5">{fmt(p)} F</span>
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Calendrier */}
                            {slotsLoading ? (
                                <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                                    <Loader2 size={18} className="animate-spin" />
                                    <span className="text-sm">Vérification des disponibilités…</span>
                                </div>
                            ) : (
                                <div>
                                    {/* Légende Hero */}
                                    {placement === 'hero' && suggestedDate && (
                                        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-500/5 border border-green-200 dark:border-green-500/20">
                                            <Calendar size={13} className="text-green-600 shrink-0" />
                                            <p className="text-[10px] font-bold text-green-700 dark:text-green-400">
                                                Prochaine disponibilité : <span className="font-black">{new Date(suggestedDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
                                            </p>
                                        </div>
                                    )}

                                    {/* Nav mois */}
                                    <div className="flex items-center justify-between mb-3">
                                        <button
                                            onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }}
                                            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <span className="text-sm font-black uppercase">{MONTH_NAMES[calMonth]} {calYear}</span>
                                        <button
                                            onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }}
                                            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>

                                    {/* Jours de la semaine */}
                                    <div className="grid grid-cols-7 mb-1">
                                        {DAY_NAMES.map(d => (
                                            <div key={d} className="text-center text-[9px] font-black text-slate-400 uppercase py-1">{d}</div>
                                        ))}
                                    </div>

                                    {/* Cellules */}
                                    <div className="grid grid-cols-7 gap-1">
                                        {buildCalendar().map((dateStr, i) => {
                                            if (!dateStr) return <div key={`empty-${i}`} />
                                            const dObj = new Date(dateStr + 'T00:00:00')
                                            const isPast = dObj < today
                                            const blocked = isDayBlocked(dateStr)
                                            const isSelected = dateStr === startDate
                                            const isSuggested = dateStr === suggestedDate && !startDate
                                            const isInRange = endDate && startDate && dateStr > startDate && dateStr <= endDate
                                            const slotsCount = heroSlots[dateStr] || 0
                                            const almostFull = placement === 'hero' && slotsCount >= 5 && slotsCount < 7

                                            return (
                                                <button
                                                    key={dateStr}
                                                    disabled={isPast || blocked}
                                                    onClick={() => !isPast && !blocked && setStartDate(dateStr)}
                                                    title={placement === 'hero' && slotsCount > 0 ? `${slotsCount}/7 slots` : undefined}
                                                    className={[
                                                        'relative aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all',
                                                        isPast ? 'text-slate-200 dark:text-slate-700 cursor-not-allowed' :
                                                        blocked ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed line-through' :
                                                        isSelected ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30 scale-110 z-10' :
                                                        isInRange ? 'bg-orange-100 dark:bg-orange-500/10 text-orange-600' :
                                                        isSuggested ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 ring-2 ring-green-400' :
                                                        almostFull ? 'bg-yellow-50 dark:bg-yellow-500/5 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100' :
                                                        'hover:bg-orange-50 dark:hover:bg-orange-500/5 text-slate-700 dark:text-slate-300',
                                                    ].join(' ')}
                                                >
                                                    {dObj.getDate()}
                                                    {almostFull && <span className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full bg-yellow-400" />}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {/* Légende */}
                                    {placement === 'hero' && (
                                        <div className="flex flex-wrap gap-3 mt-3 px-1">
                                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-orange-500" /><span className="text-[9px] text-slate-500">Sélectionné</span></div>
                                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-green-100 ring-1 ring-green-400" /><span className="text-[9px] text-slate-500">Suggéré</span></div>
                                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-yellow-100" /><span className="text-[9px] text-slate-500">Presque complet</span></div>
                                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-slate-200 line-through" /><span className="text-[9px] text-slate-500">Complet</span></div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Résumé dates */}
                            {startDate && duration && (
                                <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Période</p>
                                        <p className="text-sm font-black text-slate-800 dark:text-white">
                                            {new Date(startDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                            {' '} → {' '}
                                            {endDate && new Date(endDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Total</p>
                                        <p className="text-lg font-black italic text-orange-500">{fmt(price)} FCFA</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── ÉTAPE 4 : Aperçu ── */}
                    {step === 4 && (
                        <div>
                            <h2 className="text-lg font-black uppercase italic tracking-tighter mb-1">Aperçu de votre pub</h2>
                            <p className="text-[11px] text-slate-400 mb-5">Voici comment votre publicité apparaîtra sur le site.</p>

                            {/* Mockup */}
                            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 mb-5">
                                {placement === 'hero' ? (
                                    <div className="relative w-full" style={{ paddingBottom: '33%' }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={finalImgUrl} alt="aperçu" className="absolute inset-0 w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex flex-col justify-center px-5">
                                            <p className="text-white font-black text-sm uppercase tracking-tight drop-shadow">{productName}</p>
                                            {comment && <p className="text-white/80 text-[10px] mt-0.5 drop-shadow">{comment}</p>}
                                        </div>
                                        <div className="absolute top-2 right-2 text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500 text-white">Pub</div>
                                    </div>
                                ) : (
                                    <div className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={finalImgUrl} alt="aperçu" className="w-20 h-20 object-cover rounded-xl shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full bg-orange-500 text-white">Pub</span>
                                            </div>
                                            <p className="text-sm font-black text-slate-800 dark:text-white truncate">{productName}</p>
                                            {comment && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{comment}</p>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Récap */}
                            <div className="space-y-2">
                                {[
                                    { label: 'Emplacement', value: placement === 'hero' ? 'Hero Carousel' : 'Vignette Tile' },
                                    { label: 'Durée', value: `${duration} jours` },
                                    { label: 'Date de début', value: startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                                    { label: 'Date de fin', value: endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                                    { label: 'Montant à payer', value: `${fmt(price)} FCFA` },
                                ].map(({ label, value }) => (
                                    <div key={label} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
                                        <span className="text-sm font-black text-slate-800 dark:text-white">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── ÉTAPE 5 : Paiement ── */}
                    {step === 5 && (
                        <div>
                            <h2 className="text-lg font-black uppercase italic tracking-tighter mb-1">Paiement</h2>
                            <p className="text-[11px] text-slate-400 mb-5">Effectuez le transfert puis entrez votre code SMS.</p>

                            {/* Choix méthode */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {(['mobile_money', 'airtel_money'] as const).map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setPayMethod(m)}
                                        className={`py-2.5 px-3 rounded-xl border-2 text-xs font-black uppercase transition-all ${payMethod === m ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/5 text-orange-600' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                                    >
                                        {m === 'mobile_money' ? 'MTN MoMo' : 'Airtel Money'}
                                    </button>
                                ))}
                            </div>

                            {/* Numéro MoMo */}
                            <div className={`rounded-2xl p-5 text-center mb-3 border ${payMethod === 'airtel_money' ? 'bg-slate-50 dark:bg-slate-800 border-red-200 text-red-500' : 'bg-slate-50 dark:bg-slate-800 border-yellow-300 text-yellow-600'}`}>
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Numéro de transfert</p>
                                <p className="text-3xl font-black font-mono tracking-wider">{momoNumber}</p>
                            </div>

                            {/* Montant */}
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-center mb-5 border border-slate-200 dark:border-slate-700">
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Montant exact à envoyer</p>
                                <p className="text-2xl font-black italic text-orange-500">{fmt(price)} FCFA</p>
                            </div>

                            {/* Code transaction */}
                            <div className="mb-2">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-2">
                                    Code de transaction SMS (10 chiffres)
                                </label>
                                <div className={`rounded-2xl border-2 transition-colors ${txError ? 'border-red-500/60' : txComplete ? 'border-green-500/40' : 'border-slate-200 dark:border-slate-700 focus-within:border-orange-400'}`}>
                                    <input
                                        type="text" inputMode="numeric" autoComplete="off"
                                        value={fmtTx(txCode)}
                                        onChange={e => { setTxCode(e.target.value); setTxError('') }}
                                        onKeyDown={e => e.key === 'Enter' && void handlePay()}
                                        placeholder="000 000 000 0" maxLength={13}
                                        className="w-full py-4 px-5 bg-transparent text-xl font-mono tracking-[3px] text-center outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    />
                                </div>
                                <div className="flex justify-between mt-1 px-1">
                                    {txError ? <span className="text-red-500 text-[9px] font-bold">⚠ {txError}</span> : <span className="text-slate-400 text-[9px] font-bold">Reçu par SMS après votre transfert</span>}
                                    <span className={`text-[9px] font-black ${txComplete ? 'text-green-500' : 'text-slate-400'}`}>{txDigits.length}/10</span>
                                </div>
                            </div>

                            <button
                                disabled={!txComplete || submitting}
                                onClick={() => void handlePay()}
                                className={`w-full mt-4 py-4 rounded-2xl font-black uppercase italic text-sm transition-all ${txComplete && !submitting ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 active:scale-[0.98]' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                            >
                                {submitting ? <span className="inline-flex items-center gap-2 justify-center"><Loader2 className="animate-spin" size={18} /> Envoi...</span> : 'Valider ma publicité'}
                            </button>
                        </div>
                    )}

                    {/* Navigation Précédent / Suivant */}
                    {step > 0 && step < 5 && (
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setStep(s => (s - 1) as typeof step)}
                                className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-black text-slate-500 hover:text-slate-700 transition-colors"
                            >
                                <ChevronLeft size={16} /> Retour
                            </button>
                            <button
                                disabled={!canGoNext()}
                                onClick={() => setStep(s => (s + 1) as typeof step)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-black uppercase transition-all ${canGoNext() ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 hover:bg-orange-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                            >
                                {step === 4 ? 'Passer au paiement' : 'Suivant'} <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )

    if (typeof document === 'undefined') return null
    return createPortal(modal, document.body)
}
