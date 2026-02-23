'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import Image from 'next/image'
import StarRating from '@/app/components/StarRating'
import { confirmReception, submitRating } from '@/app/actions/ratings'
import { toast } from 'sonner'

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

const CATEGORIES = [
    {
        id: 'vendor' as const,
        icon: '🏪',
        title: 'Le vendeur',
        question: 'Comment évaluez-vous le produit et le vendeur ?',
        labels: ['Horrible', 'Mauvais', 'Correct', 'Bien', 'Excellent'],
        tags: ['Produit conforme ✅', 'Bonne qualité', 'Bien emballé', 'Rapide à expédier', 'Produit non conforme ❌', 'Mauvais emballage'],
        color: 'amber',
    },
    {
        id: 'delivery' as const,
        icon: '🏍️',
        title: 'La livraison',
        question: 'Comment s\'est passée la livraison ?',
        labels: ['Horrible', 'Mauvaise', 'Correcte', 'Bonne', 'Excellente'],
        tags: ['Rapide ⚡', 'Livreur poli', 'Colis en bon état', 'A appelé avant', 'En retard', 'Colis abîmé'],
        color: 'blue',
    },
    {
        id: 'platform' as const,
        icon: '📱',
        title: 'L\'application',
        question: 'Comment trouvez-vous notre plateforme ?',
        labels: ['Horrible', 'Mauvaise', 'Correcte', 'Bonne', 'Excellente'],
        tags: ['Facile à utiliser', 'Beau design', 'Paiement simple', 'Bon suivi commande', 'Trop compliqué', 'Bugs'],
        color: 'violet',
    },
]

interface TripleRatingModalProps {
    order: any
    onClose: () => void
    onComplete: () => void
}

export default function TripleRatingModal({ order, onClose, onComplete }: TripleRatingModalProps) {
    const [step, setStep] = useState<'confirm' | 'rating' | 'thanks'>('confirm')
    const [currentCat, setCurrentCat] = useState(0)
    const [ratings, setRatings] = useState({ vendor: 0, delivery: 0, platform: 0 })
    const [selectedTags, setSelectedTags] = useState<Record<string, string[]>>({ vendor: [], delivery: [], platform: [] })
    const [comment, setComment] = useState('')
    const [loading, setLoading] = useState(false)
    const [pointsEarned, setPointsEarned] = useState(0)
    const [totalPoints, setTotalPoints] = useState(0)

    const cat = CATEGORIES[currentCat]

    const handleConfirmReception = async () => {
        setLoading(true)
        const result = await confirmReception(order.id)
        if (result.error) {
            toast.error(result.error)
            setLoading(false)
            return
        }
        setStep('rating')
        setLoading(false)
    }

    const handleSubmitRatings = async () => {
        setLoading(true)
        const result = await submitRating({
            orderId: order.id,
            vendorRating: ratings.vendor || undefined,
            vendorTags: selectedTags.vendor,
            deliveryRating: ratings.delivery || undefined,
            deliveryTags: selectedTags.delivery,
            platformRating: ratings.platform || undefined,
            platformTags: selectedTags.platform,
            comment: comment || undefined,
        })
        if (result.error) {
            toast.error(result.error)
            setLoading(false)
            return
        }
        setPointsEarned(result.pointsEarned || 500)
        setTotalPoints(result.totalPoints || 0)
        setStep('thanks')
        setLoading(false)
    }

    const toggleTag = (catId: string, tag: string) => {
        setSelectedTags(prev => ({
            ...prev,
            [catId]: prev[catId].includes(tag)
                ? prev[catId].filter(t => t !== tag)
                : [...prev[catId], tag]
        }))
    }

    const goNext = () => {
        if (currentCat < CATEGORIES.length - 1) {
            setCurrentCat(prev => prev + 1)
        } else {
            handleSubmitRatings()
        }
    }

    // ═══════ CONFIRMATION RÉCEPTION ═══════
    if (step === 'confirm') {
        return (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-[#12121C] rounded-3xl border border-white/5 p-6 text-center relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-gray-400">
                        <X size={18} />
                    </button>

                    <div className="w-20 h-20 rounded-3xl bg-green-500/10 border-2 border-green-500/15 flex items-center justify-center text-4xl mx-auto mb-5">
                        📦
                    </div>

                    <h2 className="text-[#F0ECE2] text-xl font-extrabold mb-1">Commande reçue ?</h2>
                    <p className="text-gray-500 text-sm mb-1">Le livreur a marqué votre commande comme livrée.</p>
                    <p className="text-gray-600 text-xs mb-5">Confirmez que vous avez bien reçu votre colis.</p>

                    {/* Récap commande */}
                    <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] mb-5 text-left">
                        {order.items?.[0]?.img ? (
                            <Image src={order.items[0].img} alt="" width={56} height={56}
                                className="w-14 h-14 rounded-2xl object-cover flex-shrink-0" />
                        ) : (
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center text-2xl flex-shrink-0">📦</div>
                        )}
                        <div>
                            <p className="text-[#F0ECE2] text-sm font-semibold">{order.items?.[0]?.name || 'Produit'}</p>
                            <p className="text-gray-500 text-xs">{order.tracking_number}</p>
                            <p className="text-amber-500 text-base font-extrabold">{fmt(order.total_amount)} F</p>
                        </div>
                    </div>

                    <button onClick={handleConfirmReception} disabled={loading}
                        className="w-full py-4 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-white text-base font-bold shadow-lg shadow-green-500/25 mb-2.5 disabled:opacity-50">
                        {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : '✅ Oui, j\'ai bien reçu ma commande'}
                    </button>

                    <button onClick={onClose}
                        className="w-full py-3.5 rounded-xl border border-red-500/20 text-red-400 text-sm font-semibold bg-transparent">
                        ❌ Je n'ai pas reçu ma commande
                    </button>

                    <p className="text-gray-600 text-[10px] mt-3">
                        ⏱ Sans réponse de votre part, la livraison sera auto-confirmée sous 24h.
                    </p>
                </div>
            </div>
        )
    }

    // ═══════ NOTATION TRIPLE ═══════
    if (step === 'rating') {
        const colorMap: Record<string, string> = {
            amber: 'text-amber-500',
            blue: 'text-blue-500',
            violet: 'text-violet-500',
        }

        return (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-[#12121C] rounded-3xl border border-white/5 p-6 relative max-h-[90vh] overflow-y-auto">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-gray-400">
                        <X size={18} />
                    </button>

                    <div className="text-center mb-5">
                        <h2 className="text-[#F0ECE2] text-xl font-extrabold mb-1">Notez votre expérience ⭐</h2>
                        <p className="text-gray-600 text-xs">Étape {currentCat + 1} / {CATEGORIES.length}</p>

                        {/* Barre de progression */}
                        <div className="flex justify-center gap-1.5 mt-3">
                            {CATEGORIES.map((c, i) => (
                                <div key={c.id} className={`h-1.5 rounded-full transition-all ${
                                    i < currentCat ? 'w-7 bg-green-500' :
                                    i === currentCat ? 'w-7 bg-amber-500' :
                                    'w-2 bg-white/10'
                                }`} />
                            ))}
                        </div>
                    </div>

                    {/* Catégorie actuelle */}
                    <div className={`p-6 rounded-3xl border text-center mb-4 ${
                        cat.color === 'amber' ? 'bg-amber-500/5 border-amber-500/15' :
                        cat.color === 'blue' ? 'bg-blue-500/5 border-blue-500/15' :
                        'bg-violet-500/5 border-violet-500/15'
                    }`}>
                        <div className={`w-16 h-16 rounded-2xl mx-auto mb-3.5 flex items-center justify-center text-3xl ${
                            cat.color === 'amber' ? 'bg-amber-500/10' :
                            cat.color === 'blue' ? 'bg-blue-500/10' :
                            'bg-violet-500/10'
                        }`}>{cat.icon}</div>

                        <h3 className="text-[#F0ECE2] text-lg font-bold mb-1">{cat.title}</h3>
                        <p className="text-gray-500 text-xs mb-5">{cat.question}</p>

                        {/* Étoiles */}
                        <div className="flex justify-center mb-1.5">
                            <StarRating
                                rating={ratings[cat.id]}
                                editable
                                size={32}
                                onChange={(n) => setRatings(prev => ({ ...prev, [cat.id]: n }))}
                            />
                        </div>
                        <p className={`text-sm font-semibold h-5 ${colorMap[cat.color] || 'text-gray-500'}`}>
                            {ratings[cat.id] > 0 ? cat.labels[ratings[cat.id] - 1] : ''}
                        </p>

                        {/* Tags */}
                        {ratings[cat.id] > 0 && (
                            <div className="mt-4">
                                <p className="text-gray-500 text-[11px] mb-2">Sélectionnez des tags (optionnel) :</p>
                                <div className="flex flex-wrap gap-1.5 justify-center">
                                    {cat.tags.map(tag => {
                                        const isSelected = selectedTags[cat.id].includes(tag)
                                        return (
                                            <button key={tag} onClick={() => toggleTag(cat.id, tag)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                                    isSelected
                                                        ? cat.color === 'amber' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' :
                                                          cat.color === 'blue' ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' :
                                                          'bg-violet-500/10 border-violet-500/30 text-violet-500'
                                                        : 'bg-white/[0.02] border-white/5 text-gray-500'
                                                }`}>
                                                {tag}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Commentaire (dernière étape) */}
                    {currentCat === CATEGORIES.length - 1 && ratings[cat.id] > 0 && (
                        <textarea
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder="Un commentaire à ajouter ? (optionnel)"
                            rows={3}
                            className="w-full p-3.5 rounded-xl border border-white/5 bg-white/[0.02] text-[#F0ECE2] text-sm outline-none resize-none mb-4 placeholder:text-gray-600"
                        />
                    )}

                    {/* Navigation */}
                    <div className="flex gap-2.5">
                        {currentCat > 0 && (
                            <button onClick={() => setCurrentCat(prev => prev - 1)}
                                className="px-5 py-3.5 rounded-xl border border-white/10 text-gray-500 font-semibold text-sm">
                                ←
                            </button>
                        )}
                        <button onClick={goNext} disabled={ratings[cat.id] === 0 || loading}
                            className={`flex-1 py-3.5 rounded-xl text-base font-bold transition-all ${
                                ratings[cat.id] > 0
                                    ? currentCat === CATEGORIES.length - 1
                                        ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25'
                                        : cat.color === 'amber' ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white' :
                                          cat.color === 'blue' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' :
                                          'bg-gradient-to-br from-violet-500 to-violet-600 text-white'
                                    : 'bg-white/5 text-gray-600 cursor-not-allowed'
                            }`}>
                            {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> :
                                currentCat < CATEGORIES.length - 1 ? 'Suivant →' : 'Envoyer mes notes ✓'}
                        </button>
                    </div>

                    {/* Passer */}
                    <button onClick={goNext}
                        className="w-full py-2.5 mt-2 bg-transparent border-none text-gray-600 text-xs cursor-pointer">
                        Passer cette étape
                    </button>
                </div>
            </div>
        )
    }

    // ═══════ MERCI ═══════
    if (step === 'thanks') {
        const avg = Object.values(ratings).filter(r => r > 0)
        const avgRating = avg.length > 0 ? (avg.reduce((s, r) => s + r, 0) / avg.length).toFixed(1) : '—'

        return (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-[#12121C] rounded-3xl border border-white/5 p-6 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/15 flex items-center justify-center text-4xl mx-auto mb-5 animate-bounce">
                        🙏
                    </div>

                    <h2 className="text-[#F0ECE2] text-2xl font-extrabold mb-1">Merci pour votre avis !</h2>
                    <p className="text-gray-500 text-sm mb-5">Votre retour nous aide à améliorer l'expérience pour tout le monde.</p>

                    {/* Résumé */}
                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] mb-5">
                        <div className="flex justify-center gap-5 mb-4">
                            {CATEGORIES.map(c => (
                                <div key={c.id} className="text-center">
                                    <div className={`w-12 h-12 rounded-xl mx-auto mb-1.5 flex items-center justify-center text-2xl ${
                                        c.color === 'amber' ? 'bg-amber-500/10' :
                                        c.color === 'blue' ? 'bg-blue-500/10' :
                                        'bg-violet-500/10'
                                    }`}>{c.icon}</div>
                                    <div className={`text-lg font-extrabold ${
                                        c.color === 'amber' ? 'text-amber-500' :
                                        c.color === 'blue' ? 'text-blue-500' :
                                        'text-violet-500'
                                    }`}>
                                        {ratings[c.id] > 0 ? `${ratings[c.id]}★` : '—'}
                                    </div>
                                    <div className="text-gray-600 text-[10px]">{c.title}</div>
                                </div>
                            ))}
                        </div>

                        <div className="h-px bg-white/[0.04] mb-3" />

                        <div className="flex items-center justify-center gap-2">
                            <span className="text-gray-500 text-sm">Note moyenne :</span>
                            <span className="text-amber-500 text-xl font-extrabold">{avgRating} ⭐</span>
                        </div>
                    </div>

                    {/* Points fidélité */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500/5 to-blue-500/5 border border-green-500/10 flex items-center gap-3 mb-5 text-left">
                        <span className="text-2xl">🎁</span>
                        <div>
                            <p className="text-green-400 text-sm font-bold">+{pointsEarned} points de fidélité gagnés !</p>
                            <p className="text-gray-500 text-[11px]">
                                Total : {totalPoints} points · 1 000 points = 2 000 F de réduction
                            </p>
                        </div>
                    </div>

                    <button onClick={() => { onComplete(); onClose() }}
                        className="w-full py-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white text-base font-bold shadow-lg shadow-amber-500/25">
                        Continuer mes achats →
                    </button>
                </div>
            </div>
        )
    }

    return null
}
