'use client'

import useEmblaCarousel from 'embla-carousel-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import TrendProductCard from '@/app/components/TrendProductCard'
import type { ProductCardProduct } from '@/app/components/ProductCard'
import {
    buildPubProductMixSlides,
    type TileCampaignSlide,
} from '@/lib/buildPubProductMixSlides'

const EMBLA_OPTIONS = {
    align: 'start' as const,
    loop: false,
    containScroll: 'trimSnaps' as const,
    dragFree: false,
    watchDrag: false,
    /** Saut instantané à chaque clic (pas de glissement animé). */
    duration: 0,
    slidesToScroll: 1,
}

/** Même largeur de slide que `TrendsProductSlider` pour l’alignement visuel. */
const SLIDE_BASIS =
    'min-w-0 shrink-0 grow-0 basis-[calc((100%-0.75rem)/1.5)] md:basis-[calc((100%-2.25rem)/3.5)] lg:basis-[calc((100%-3.75rem)/5.5)]'

function TileSlide({ campaign }: { campaign: TileCampaignSlide }) {
    return (
        <Link
            href={campaign.link_url}
            className="group flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-neutral-200/90 bg-neutral-100 shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900"
        >
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                <img
                    src={campaign.image_url || '/placeholder-image.svg'}
                    alt={campaign.title || 'Sponsorisé'}
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/85">Sponsorisé</p>
                    <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug">{campaign.title || 'À découvrir'}</p>
                </div>
            </div>
        </Link>
    )
}

export default function PubProductMixSlider({
    products,
    tileCampaigns,
}: {
    products: ProductCardProduct[]
    tileCampaigns: TileCampaignSlide[]
}) {
    const slides = buildPubProductMixSlides(products, tileCampaigns)
    const [emblaRef, emblaApi] = useEmblaCarousel(EMBLA_OPTIONS)
    const [canPrev, setCanPrev] = useState(false)
    const [canNext, setCanNext] = useState(false)

    const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
    const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

    const onSelect = useCallback(() => {
        if (!emblaApi) return
        setCanPrev(emblaApi.canScrollPrev())
        setCanNext(emblaApi.canScrollNext())
    }, [emblaApi])

    useEffect(() => {
        if (!emblaApi) return
        onSelect()
        emblaApi.on('select', onSelect)
        emblaApi.on('reInit', onSelect)
        return () => {
            emblaApi.off('select', onSelect)
            emblaApi.off('reInit', onSelect)
        }
    }, [emblaApi, onSelect])

    if (slides.length === 0) return null

    return (
        <div className="group/trends relative">
            <button
                type="button"
                aria-label="Voir précédent"
                onClick={scrollPrev}
                disabled={!canPrev}
                className={[
                    'absolute left-0 top-1/2 z-20 flex h-14 w-10 -translate-y-1/2 items-center justify-center rounded-lg border border-neutral-200/90 bg-white text-neutral-700 shadow-md transition-[opacity,box-shadow] duration-200 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700',
                    !canPrev
                        ? 'pointer-events-none opacity-0'
                        : 'pointer-events-auto opacity-100 md:pointer-events-none md:opacity-0 md:group-hover/trends:pointer-events-auto md:group-hover/trends:opacity-100',
                ].join(' ')}
            >
                <ChevronLeft className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </button>

            <button
                type="button"
                aria-label="Voir suivant"
                onClick={scrollNext}
                disabled={!canNext}
                className={[
                    'absolute right-0 top-1/2 z-20 flex h-14 w-10 -translate-y-1/2 items-center justify-center rounded-lg border border-neutral-200/90 bg-white text-neutral-700 shadow-md transition-[opacity,box-shadow] duration-200 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700',
                    !canNext
                        ? 'pointer-events-none opacity-0'
                        : 'pointer-events-auto opacity-100 md:pointer-events-none md:opacity-0 md:group-hover/trends:pointer-events-auto md:group-hover/trends:opacity-100',
                ].join(' ')}
            >
                <ChevronRight className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </button>

            <div className="overflow-hidden px-1 md:px-12" ref={emblaRef}>
                <div className="-ml-1 flex gap-3 pl-1">
                    {slides.map((slide, index) => (
                        <div key={slide.type === 'product' ? `p-${slide.product.id}-${index}` : `t-${slide.campaign.id}-${slide.slot}-${index}`} className={SLIDE_BASIS}>
                            {slide.type === 'product' ? (
                                <TrendProductCard product={slide.product} aboveFold={index < 8} />
                            ) : (
                                <TileSlide campaign={slide.campaign} />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
