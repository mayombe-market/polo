'use client'

import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { computeVendorBadges, BADGE_DEFINITIONS, type VendorBadge } from '@/lib/vendorBadges'
import { Star, TrendingUp, Users, ShoppingBag, Award, ChevronRight, Lightbulb } from 'lucide-react'

interface ReputationStats {
    averageRating: number
    reviewCount: number
    followerCount: number
    confirmedSales: number
}

interface Tip {
    text: string
    icon: 'star' | 'users' | 'bag'
    done: boolean
}

function buildTips(stats: ReputationStats, badges: VendorBadge[]): Tip[] {
    const tips: Tip[] = []
    const hasTrusted = badges.some(b => b.id === 'trusted')
    const hasWellRated = badges.some(b => b.id === 'well_rated')
    const hasVerified = badges.some(b => b.id === 'verified')

    if (!hasVerified) {
        tips.push({ text: 'Faites vérifier votre compte pour obtenir le badge Vendeur vérifié.', icon: 'star', done: false })
    }
    if (stats.reviewCount < 10) {
        tips.push({ text: `Obtenez ${10 - stats.reviewCount} avis supplémentaire${10 - stats.reviewCount > 1 ? 's' : ''} pour débloquer le badge Bien évalué.`, icon: 'star', done: hasWellRated || hasTrusted })
    }
    if (stats.averageRating > 0 && stats.averageRating < 4.5 && stats.reviewCount >= 5) {
        tips.push({ text: 'Soignez vos emballages et répondez aux messages rapidement pour améliorer votre note.', icon: 'star', done: false })
    }
    if (stats.followerCount < 20) {
        tips.push({ text: 'Partagez votre boutique sur WhatsApp pour gagner des abonnés.', icon: 'users', done: false })
    }
    if (stats.confirmedSales < 30) {
        tips.push({ text: `Atteignez 30 ventes confirmées pour le badge Vendeur de confiance (${stats.confirmedSales}/30).`, icon: 'bag', done: hasTrusted })
    }

    return tips.slice(0, 4)
}

export default function VendorReputationDashboard({ profile, followerCount }: { profile: any; followerCount: number }) {
    const [stats, setStats] = useState<ReputationStats>({
        averageRating: 0,
        reviewCount: 0,
        followerCount,
        confirmedSales: profile?.confirmed_sales_count ?? 0,
    })
    const [recentReviews, setRecentReviews] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!profile?.id) { setLoading(false); return }
        const supabase = getSupabaseBrowserClient()

        const load = async () => {
            try {
                const { data: reviewsData } = await supabase.rpc('get_seller_reviews', { p_seller_id: profile.id })
                const reviews: any[] = reviewsData || []

                const ratings = reviews.map((r: any) => r.vendor_rating).filter((r: any) => typeof r === 'number' && r > 0)
                const avg = ratings.length > 0 ? parseFloat((ratings.reduce((s: number, r: number) => s + r, 0) / ratings.length).toFixed(1)) : 0

                setStats({
                    averageRating: avg,
                    reviewCount: reviews.length,
                    followerCount,
                    confirmedSales: profile?.confirmed_sales_count ?? 0,
                })
                setRecentReviews(reviews.slice(0, 5))
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [profile?.id, followerCount, profile?.confirmed_sales_count])

    const badges = computeVendorBadges({
        verification_status: profile?.verification_status,
        confirmed_sales_count: stats.confirmedSales,
        averageRating: stats.averageRating,
        reviewCount: stats.reviewCount,
        created_at: profile?.created_at,
    })

    const tips = buildTips(stats, badges)

    const statCards = [
        { label: 'Note moyenne', value: stats.averageRating > 0 ? `${stats.averageRating} ★` : '—', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        { label: 'Avis reçus', value: stats.reviewCount, icon: TrendingUp, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
        { label: 'Abonnés', value: stats.followerCount, icon: Users, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
        { label: 'Ventes confirmées', value: stats.confirmedSales, icon: ShoppingBag, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
    ]

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 px-1">

            {/* Header */}
            <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter dark:text-white">Ma réputation</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Votre image sur Mayombe Market</p>
            </div>

            {/* Badges */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Award size={16} className="text-orange-500" />
                    <span className="text-sm font-bold dark:text-white">Vos badges</span>
                </div>
                {badges.length === 0 ? (
                    <p className="text-sm text-slate-400">Aucun badge pour l'instant. Continuez à vendre !</p>
                ) : (
                    <div className="flex flex-wrap gap-3">
                        {badges.map(badge => (
                            <div
                                key={badge.id}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border"
                                style={{ background: badge.bg, borderColor: badge.color + '30', color: badge.color }}
                            >
                                <span className="text-base leading-none">{badge.emoji}</span>
                                <div>
                                    <p className="text-xs font-bold leading-tight">{badge.label}</p>
                                    <p className="text-[10px] opacity-70 leading-tight mt-0.5 max-w-[200px]">{badge.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tous les badges possibles */}
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Tous les badges</p>
                    <div className="grid grid-cols-2 gap-2">
                        {BADGE_DEFINITIONS.map(def => {
                            const earned = badges.some(b => b.id === def.id)
                            return (
                                <div
                                    key={def.id}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-opacity ${earned ? 'opacity-100' : 'opacity-35'}`}
                                    style={{ background: earned ? def.bg : '#F1F5F9', color: earned ? def.color : '#94A3B8' }}
                                >
                                    <span>{def.emoji}</span>
                                    <span>{def.label}</span>
                                    {earned && <span className="ml-auto text-[9px] font-black uppercase">Obtenu</span>}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
                {statCards.map(s => (
                    <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                        <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                            <s.icon size={16} className={s.color} />
                        </div>
                        <p className="text-2xl font-black tracking-tighter dark:text-white">{s.value}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Conseils personnalisés */}
            {tips.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Lightbulb size={16} className="text-orange-500" />
                        <span className="text-sm font-bold dark:text-white">Conseils pour progresser</span>
                    </div>
                    <div className="space-y-3">
                        {tips.map((tip, i) => (
                            <div
                                key={i}
                                className={`flex items-start gap-3 p-3 rounded-xl ${tip.done ? 'opacity-50' : ''}`}
                                style={{ background: tip.done ? '#F8FAFC' : '#FFF7ED' }}
                            >
                                <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-black ${tip.done ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                    {tip.done ? '✓' : (i + 1)}
                                </div>
                                <p className={`text-xs leading-relaxed ${tip.done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {tip.text}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Derniers avis */}
            {recentReviews.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Star size={16} className="text-amber-500" />
                        <span className="text-sm font-bold dark:text-white">Derniers avis reçus</span>
                    </div>
                    <div className="space-y-3">
                        {recentReviews.map((review: any, i: number) => (
                            <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-600 dark:text-slate-300">
                                    {(review.buyer_name || 'A')[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-bold dark:text-white truncate">{review.buyer_name || 'Acheteur anonyme'}</p>
                                        <span className="text-xs text-amber-500 flex-shrink-0">{'★'.repeat(Math.round(review.vendor_rating || 0))}</span>
                                    </div>
                                    {review.comment && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5 line-clamp-2">{review.comment}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <a
                        href={`/store/${profile?.id}?tab=reviews`}
                        className="mt-3 flex items-center gap-1 text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Voir tous les avis <ChevronRight size={12} />
                    </a>
                </div>
            )}
        </div>
    )
}
