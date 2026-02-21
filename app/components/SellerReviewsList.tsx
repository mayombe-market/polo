'use client'

import Image from 'next/image'
import StarRating from './StarRating'
import { MessageSquare } from 'lucide-react'

interface SellerReviewsListProps {
    reviews: any[]
    averageRating: number
}

export default function SellerReviewsList({ reviews, averageRating }: SellerReviewsListProps) {
    if (reviews.length === 0) {
        return (
            <div className="py-20 text-center bg-slate-50 dark:bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                <MessageSquare className="mx-auto text-slate-200 dark:text-slate-700 mb-4" size={48} />
                <p className="font-black uppercase text-xs italic text-slate-400">
                    Aucun avis pour le moment
                </p>
                <p className="text-[10px] text-slate-400 mt-2">
                    Les avis des clients apparaîtront ici.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Résumé note moyenne */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 flex items-center gap-6">
                <div className="text-center">
                    <p className="text-4xl font-black tracking-tighter dark:text-white">
                        {averageRating.toFixed(1)}
                    </p>
                    <StarRating rating={averageRating} size={14} />
                    <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mt-1">
                        {reviews.length} avis
                    </p>
                </div>
                <div className="flex-1">
                    {/* Distribution des étoiles */}
                    {[5, 4, 3, 2, 1].map((star) => {
                        const count = reviews.filter(r => Math.round(r.rating) === star).length
                        const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                        return (
                            <div key={star} className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black text-slate-400 w-4 text-right">{star}</span>
                                <span className="text-[10px] text-orange-500">★</span>
                                <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-orange-500 rounded-full transition-all duration-500"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 w-6">{count}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Liste des avis */}
            <div className="space-y-4">
                {reviews.map((review, i) => (
                    <div
                        key={review.id || i}
                        className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 border border-slate-100 dark:border-slate-800 transition-all hover:border-orange-500/20"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                                    {review.user_avatar ? (
                                        <Image
                                            src={review.user_avatar}
                                            alt=""
                                            width={40}
                                            height={40}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-sm font-black text-slate-400 italic">
                                            {(review.user_name || 'C')?.[0]?.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase italic dark:text-white leading-tight">
                                        {review.user_name || 'Client'}
                                    </p>
                                    <StarRating rating={review.rating} size={12} />
                                </div>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400">
                                {review.created_at
                                    ? new Date(review.created_at).toLocaleDateString('fr-FR')
                                    : ''}
                            </span>
                        </div>

                        {review.comment && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                {review.comment}
                            </p>
                        )}

                        {/* Images de l'avis */}
                        {review.images && review.images.length > 0 && (
                            <div className="flex gap-2 mt-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                                {review.images.map((img: string, idx: number) => (
                                    <div key={idx} className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-800">
                                        <Image
                                            src={img}
                                            alt=""
                                            width={64}
                                            height={64}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
