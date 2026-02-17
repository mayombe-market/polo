'use client'
import { Star, StarHalf } from 'lucide-react'

interface StarRatingProps {
    rating: number;           // La note actuelle (ex: 3.5)
    max?: number;             // Note max (par défaut 5)
    size?: number;            // Taille des étoiles
    editable?: boolean;       // Si true, on peut cliquer pour noter
    onChange?: (n: number) => void; // Fonction appelée quand on clique
}

export default function StarRating({
    rating,
    max = 5,
    size = 18,
    editable = false,
    onChange
}: StarRatingProps) {

    return (
        <div className="flex items-center gap-1">
            {[...Array(max)].map((_, i) => {
                const starNumber = i + 1;
                const isFull = starNumber <= rating;
                const isHalf = !isFull && starNumber - 0.5 <= rating;

                return (
                    <button
                        key={i}
                        type="button"
                        disabled={!editable}
                        onClick={() => editable && onChange?.(starNumber)}
                        className={`${editable ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
                    >
                        {isFull ? (
                            <Star size={size} fill="#f59e0b" color="#f59e0b" /> // Orange-500
                        ) : isHalf ? (
                            <div className="relative">
                                <Star size={size} color="#cbd5e1" /> {/* Slate-300 (vide) */}
                                <div className="absolute inset-0 overflow-hidden w-[50%]">
                                    <Star size={size} fill="#f59e0b" color="#f59e0b" />
                                </div>
                            </div>
                        ) : (
                            <Star size={size} color="#cbd5e1" /> // Slate-300 (vide)
                        )}
                    </button>
                );
            })}

            {!editable && rating > 0 && (
                <span className="ml-2 text-xs font-black text-slate-500 italic">
                    {rating.toFixed(1)}
                </span>
            )}
        </div>
    )
}