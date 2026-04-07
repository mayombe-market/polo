'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import CloudinaryImage from '@/app/components/CloudinaryImage'

type Props = {
    images: string[]
    productName: string
}

export default function RealEstateGallery({ images, productName }: Props) {
    const list = useMemo(() => (Array.isArray(images) ? images.filter(Boolean) : []), [images])
    const [lightbox, setLightbox] = useState<number | null>(null)

    const open = useCallback((i: number) => setLightbox(i), [])
    const close = useCallback(() => setLightbox(null), [])

    const goPrev = useCallback(() => {
        setLightbox((cur) => {
            if (cur === null || list.length === 0) return cur
            return (cur - 1 + list.length) % list.length
        })
    }, [list.length])

    const goNext = useCallback(() => {
        setLightbox((cur) => {
            if (cur === null || list.length === 0) return cur
            return (cur + 1) % list.length
        })
    }, [list.length])

    useEffect(() => {
        if (lightbox === null) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close()
            if (e.key === 'ArrowLeft') goPrev()
            if (e.key === 'ArrowRight') goNext()
        }
        window.addEventListener('keydown', onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', onKey)
            document.body.style.overflow = prev
        }
    }, [lightbox, close, goPrev, goNext])

    if (list.length === 0) {
        return (
            <div className="aspect-[4/3] rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-semibold">
                Aucune image
            </div>
        )
    }

    const main = list[0]
    const rest = list.slice(1)
    const extraCount = Math.max(0, list.length - 3)

    return (
        <>
            {/* Desktop / tablet : grille */}
            <div className="hidden md:block rounded-2xl overflow-hidden">
                {list.length === 1 ? (
                    <button
                        type="button"
                        onClick={() => open(0)}
                        className="relative aspect-[16/10] w-full cursor-zoom-in"
                        aria-label="Voir la photo en grand"
                    >
                        <CloudinaryImage
                            src={main}
                            alt={productName}
                            fill
                            delivery="catalog"
                            sizes="(max-width: 1280px) 90vw, 1024px"
                            className="object-cover"
                            priority
                            fetchPriority="high"
                        />
                    </button>
                ) : (
                    <div className="grid grid-cols-2 grid-rows-2 gap-1">
                        <button
                            type="button"
                            onClick={() => open(0)}
                            className="relative row-span-2 min-h-[280px] cursor-zoom-in"
                            aria-label="Photo principale"
                        >
                            <CloudinaryImage
                                src={main}
                                alt={productName}
                                fill
                                delivery="catalog"
                                sizes="(max-width: 1280px) 45vw, 640px"
                                className="object-cover"
                                priority
                                fetchPriority="high"
                            />
                        </button>
                        {list[1] ? (
                            <button
                                type="button"
                                onClick={() => open(1)}
                                className="relative min-h-[136px] cursor-zoom-in"
                                aria-label="Photo 2"
                            >
                                <CloudinaryImage
                                    src={list[1]}
                                    alt=""
                                    fill
                                    delivery="catalog"
                                    sizes="(max-width: 1280px) 45vw, 400px"
                                    className="object-cover"
                                />
                            </button>
                        ) : (
                            <div className="min-h-[136px] bg-slate-100 dark:bg-slate-800" />
                        )}
                        {list[2] ? (
                            <button
                                type="button"
                                onClick={() => open(2)}
                                className="relative min-h-[136px] cursor-zoom-in"
                                aria-label="Photo 3"
                            >
                                <CloudinaryImage
                                    src={list[2]}
                                    alt=""
                                    fill
                                    delivery="catalog"
                                    sizes="(max-width: 1280px) 45vw, 400px"
                                    className="object-cover"
                                />
                                {extraCount > 0 && (
                                    <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-bold text-white">
                                        +{extraCount} photo{extraCount > 1 ? 's' : ''}
                                    </span>
                                )}
                            </button>
                        ) : (
                            <div className="min-h-[136px] bg-slate-100 dark:bg-slate-800" />
                        )}
                    </div>
                )}
            </div>

            {/* Mobile : grande image + scroll horizontal */}
            <div className="md:hidden space-y-1">
                <button
                    type="button"
                    onClick={() => open(0)}
                    className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl cursor-zoom-in"
                    aria-label="Photo principale"
                >
                    <CloudinaryImage
                        src={main}
                        alt={productName}
                        fill
                        delivery="catalog"
                        sizes="100vw"
                        className="object-cover"
                        priority
                        fetchPriority="high"
                    />
                </button>
                {rest.length > 0 && (
                    <div className="flex gap-1 overflow-x-auto pb-1 pt-0.5 snap-x snap-mandatory no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {rest.map((src, idx) => {
                            const i = idx + 1
                            const isThirdImage = idx === 1
                            const showMoreOverlay = isThirdImage && list.length > 3
                            return (
                                <button
                                    key={`${src}-${i}`}
                                    type="button"
                                    onClick={() => open(i)}
                                    className="relative h-24 w-28 shrink-0 snap-start overflow-hidden rounded-xl"
                                    aria-label={`Photo ${i + 1}`}
                                >
                                    <CloudinaryImage
                                        src={src}
                                        alt=""
                                        fill
                                        delivery="catalog"
                                        sizes="112px"
                                        className="object-cover"
                                    />
                                    {showMoreOverlay && (
                                        <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-bold text-white">
                                            +{list.length - 3}
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Lightbox */}
            {lightbox !== null && list[lightbox] && (
                <div
                    className="fixed inset-0 z-[100] flex flex-col bg-black/95"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Galerie photos"
                >
                    <div className="flex items-center justify-between px-4 py-3 text-white/90">
                        <span className="text-sm font-medium tabular-nums">
                            {lightbox + 1} / {list.length}
                        </span>
                        <button
                            type="button"
                            onClick={close}
                            className="rounded-full p-2 hover:bg-white/10 transition-colors"
                            aria-label="Fermer"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                    <div className="relative flex flex-1 items-center justify-center px-2 pb-8">
                        <button
                            type="button"
                            onClick={goPrev}
                            className="absolute left-2 z-10 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 disabled:opacity-30"
                            aria-label="Photo précédente"
                        >
                            <ChevronLeft className="h-8 w-8" />
                        </button>
                        <div className="relative mx-auto h-[min(85vh,900px)] w-full max-w-6xl">
                            <CloudinaryImage
                                src={list[lightbox]}
                                alt={`${productName} — ${lightbox + 1}`}
                                fill
                                delivery="default"
                                sizes="100vw"
                                className="object-contain"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={goNext}
                            className="absolute right-2 z-10 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                            aria-label="Photo suivante"
                        >
                            <ChevronRight className="h-8 w-8" />
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
