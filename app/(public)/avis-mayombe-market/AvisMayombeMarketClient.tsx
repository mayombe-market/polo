'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Star, ThumbsUp, MessageCircle } from 'lucide-react'

type PlatformReview = {
    id: string
    platform_rating: number
    comment: string | null
    created_at: string
}

function StarDisplay({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
                <Star
                    key={i}
                    size={12}
                    className={i <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700'}
                />
            ))}
        </div>
    )
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const DISTRIBUTION_LABELS: Record<number, string> = {
    5: 'Excellent', 4: 'Très bien', 3: 'Bien', 2: 'Passable', 1: 'Mauvais',
}

export default function AvisMayombeMarketClient({ reviews }: { reviews: PlatformReview[] }) {
    const [filter, setFilter] = useState<number | null>(null)

    const avgRating = reviews.length > 0
        ? parseFloat((reviews.reduce((s, r) => s + r.platform_rating, 0) / reviews.length).toFixed(1))
        : 0

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    reviews.forEach(r => {
        const k = Math.round(r.platform_rating)
        if (k >= 1 && k <= 5) distribution[k]++
    })

    const visible = filter !== null ? reviews.filter(r => Math.round(r.platform_rating) === filter) : reviews
    const withComment = visible.filter(r => r.comment?.trim())

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
                <div className="max-w-3xl mx-auto px-4 pt-6 pb-16">
                    <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium mb-8 transition-colors">
                        <ArrowLeft size={16} />
                        Retour à l&apos;accueil
                    </Link>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Star size={24} />
                        </div>
                        <div>
                            <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Mayombe Market</p>
                            <h1 className="text-3xl font-black uppercase italic tracking-tighter">Avis sur la plateforme</h1>
                        </div>
                    </div>
                    <p className="text-white/80 text-sm max-w-lg">
                        Les acheteurs partagent leur expérience globale après chaque commande.
                    </p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 -mt-8 pb-20">
                {/* Score global */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 mb-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                        <div className="text-center">
                            <p className="text-6xl font-black tracking-tighter dark:text-white">{avgRating > 0 ? avgRating : '—'}</p>
                            <div className="flex justify-center mt-2">
                                {avgRating > 0 && <StarDisplay rating={Math.round(avgRating)} />}
                            </div>
                            <p className="text-xs text-slate-400 mt-2">{reviews.length} avis</p>
                        </div>
                        <div className="flex-1 w-full">
                            {[5, 4, 3, 2, 1].map(n => {
                                const count = distribution[n] || 0
                                const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                                return (
                                    <button
                                        key={n}
                                        onClick={() => setFilter(filter === n ? null : n)}
                                        className={`flex items-center gap-2 w-full mb-1.5 transition-opacity ${filter === n ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                                    >
                                        <span className="text-xs text-slate-500 w-16 text-right flex-shrink-0">{DISTRIBUTION_LABELS[n]}</span>
                                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${pct}%`, background: filter === n ? '#6366F1' : '#F59E0B' }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-400 w-6 flex-shrink-0">{count}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    {filter !== null && (
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <p className="text-xs text-slate-500">Filtre : {filter} étoile{filter > 1 ? 's' : ''} ({visible.length} avis)</p>
                            <button onClick={() => setFilter(null)} className="text-xs text-indigo-500 font-bold hover:underline">Effacer</button>
                        </div>
                    )}
                </div>

                {/* Avis avec commentaires */}
                <div className="mb-4 flex items-center gap-2">
                    <MessageCircle size={16} className="text-indigo-500" />
                    <h2 className="text-sm font-bold dark:text-white">{withComment.length} avis avec commentaire</h2>
                </div>

                {withComment.length === 0 ? (
                    <div className="text-center py-16">
                        <ThumbsUp size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                        <p className="text-sm text-slate-400">Aucun avis avec commentaire pour ce filtre.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {withComment.map(review => (
                            <div key={review.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                            ✓
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold dark:text-white">Acheteur vérifié</p>
                                            <p className="text-[10px] text-slate-400">{formatDate(review.created_at)}</p>
                                        </div>
                                    </div>
                                    <StarDisplay rating={Math.round(review.platform_rating)} />
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-12">
                                    &ldquo;{review.comment}&rdquo;
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-10 text-center">
                    <Link
                        href="/marketplace"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors"
                    >
                        Explorer la marketplace
                    </Link>
                </div>
            </div>
        </div>
    )
}
