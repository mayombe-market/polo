'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { ArrowLeft, Star, Loader2, ThumbsUp, MessageCircle } from 'lucide-react'

type PlatformReview = {
    id: string
    platform_rating: number | null
    comment: string | null
    created_at: string
    buyer_name: string | null
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

const DISTRIBUTION_LABELS: Record<number, string> = { 5: 'Excellent', 4: 'Très bien', 3: 'Bien', 2: 'Passable', 1: 'Mauvais' }

export default function AvisMayombeMarketPage() {
    const [reviews, setReviews] = useState<PlatformReview[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<number | null>(null)

    useEffect(() => {
        const supabase = getSupabaseBrowserClient()
        const load = async () => {
            try {
                const { data } = await supabase
                    .from('ratings')
                    .select('id, platform_rating, comment, created_at, buyer_name')
                    .not('platform_rating', 'is', null)
                    .gte('platform_rating', 1)
                    .order('created_at', { ascending: false })
                    .limit(200)
                setReviews(data || [])
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const rated = reviews.filter(r => r.platform_rating !== null && r.platform_rating! > 0)
    const avgRating = rated.length > 0
        ? parseFloat((rated.reduce((s, r) => s + (r.platform_rating ?? 0), 0) / rated.length).toFixed(1))
        : 0

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    rated.forEach(r => {
        const k = Math.round(r.platform_rating!)
        if (k >= 1 && k <= 5) distribution[k]++
    })

    const visible = filter !== null ? rated.filter(r => Math.round(r.platform_rating!) === filter) : rated
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
                        Les acheteurs partagent leur expérience globale sur Mayombe Market après chaque commande.
                    </p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 -mt-8 pb-20">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <>
                        {/* Score global */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 mb-6 shadow-sm">
                            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                                <div className="text-center">
                                    <p className="text-6xl font-black tracking-tighter dark:text-white">{avgRating > 0 ? avgRating : '—'}</p>
                                    <div className="flex justify-center mt-2">
                                        {avgRating > 0 && <StarDisplay rating={Math.round(avgRating)} />}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">{rated.length} avis</p>
                                </div>
                                <div className="flex-1 w-full">
                                    {[5, 4, 3, 2, 1].map(n => {
                                        const count = distribution[n] || 0
                                        const pct = rated.length > 0 ? (count / rated.length) * 100 : 0
                                        return (
                                            <button
                                                key={n}
                                                onClick={() => setFilter(filter === n ? null : n)}
                                                className={`flex items-center gap-2 w-full mb-1.5 group ${filter === n ? 'opacity-100' : 'opacity-70 hover:opacity-100'} transition-opacity`}
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
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                    {(review.buyer_name || 'A')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold dark:text-white">{review.buyer_name || 'Acheteur anonyme'}</p>
                                                    <p className="text-[10px] text-slate-400">{formatDate(review.created_at)}</p>
                                                </div>
                                            </div>
                                            {review.platform_rating && (
                                                <StarDisplay rating={Math.round(review.platform_rating)} />
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-3 pl-12">
                                            &ldquo;{review.comment}&rdquo;
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* CTA */}
                        <div className="mt-10 text-center">
                            <Link
                                href="/marketplace"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors"
                            >
                                Explorer la marketplace
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
