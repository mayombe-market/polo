'use client'

import { memo, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'

function ProductGallery({ images, productName, priorityMain = false }: { images: string[], productName: string, priorityMain?: boolean }) {
    const normalizedImages = useMemo(() => (Array.isArray(images) ? images : []), [images])
    const firstImage = normalizedImages[0] ?? ''

    // Initialisation de l'image principale
    const [mainImg, setMainImg] = useState(firstImage)

    // Synchronisation au chargement
    useEffect(() => {
        if (firstImage) setMainImg(firstImage)
    }, [firstImage])

    if (normalizedImages.length === 0) {
        return (
            <div className="aspect-square rounded-[2.5rem] bg-slate-100 animate-pulse border flex items-center justify-center text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                Aucune image
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Image Principale - CORRECTION QUALITÉ OPTIMISÉE */}
            <div className="aspect-square rounded-[2.5rem] overflow-hidden bg-white border border-slate-100 shadow-sm group relative">
                <Image
                    src={mainImg || firstImage}
                    alt={productName}
                    fill
                    // Page produit (max-w-lg): éviter de servir une 4K sur desktop
                    sizes="(max-width: 640px) 100vw, 512px"
                    quality={80}
                    priority={priorityMain}
                    fetchPriority={priorityMain ? 'high' : 'auto'}
                    className="object-cover transition-all duration-700 ease-in-out group-hover:scale-105"
                />

                {/* Overlay discret au survol */}
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                    <span className="bg-white/90 backdrop-blur-md px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-500">
                        Plein écran
                    </span>
                </div>
            </div>

            {/* Miniatures interactives */}
            {normalizedImages.length > 1 && (
                <div className="grid grid-cols-5 gap-3">
                    {normalizedImages.map((img, i) => (
                        <div
                            key={i}
                            onClick={() => setMainImg(img)}
                            onMouseEnter={() => setMainImg(img)}
                            className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-300 cursor-pointer ${mainImg === img
                                    ? 'border-green-600 scale-90 shadow-md rotate-2'
                                    : 'border-transparent hover:border-green-300 opacity-60 hover:opacity-100 hover:scale-105'
                                }`}
                        >
                            <Image
                                src={img}
                                fill
                                // 5 vignettes: ~20% de la largeur, mais cap visuel autour de ~96px
                                sizes="(max-width: 640px) 18vw, 96px"
                                quality={55}
                                className="object-cover"
                                alt={`miniature-${i}`}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

const propsAreEqual = (
    prev: { images: string[]; productName: string; priorityMain?: boolean },
    next: { images: string[]; productName: string; priorityMain?: boolean }
) => {
    if ((prev.priorityMain ?? false) !== (next.priorityMain ?? false)) return false
    if (prev.productName !== next.productName) return false
    if (prev.images === next.images) return true
    if (prev.images.length !== next.images.length) return false
    for (let i = 0; i < prev.images.length; i++) {
        if (prev.images[i] !== next.images[i]) return false
    }
    return true
}

export default memo(ProductGallery, propsAreEqual)