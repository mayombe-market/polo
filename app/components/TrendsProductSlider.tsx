'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import TrendProductCard from '@/app/components/TrendProductCard'
import type { ProductCardProduct } from '@/app/components/ProductCard'

function isProductDisplayReady(p: ProductCardProduct | null | undefined): boolean {
    if (!p || typeof p !== 'object') return false
    const id = typeof p.id === 'string' && p.id.trim().length > 0
    const name = typeof p.name === 'string' && p.name.trim().length > 0
    const price = typeof p.price === 'number' && Number.isFinite(p.price)
    return id && name && price
}

export default function TrendsProductSlider({ products }: { products: ProductCardProduct[] }) {
    const ready = products.filter(isProductDisplayReady)
    const [emblaRef, emblaApi] = useEmblaCarousel({
        align: 'start',
        loop: false,
        containScroll: 'trimSnaps',
        dragFree: false,
    })
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

    if (ready.length === 0) return null

    return (
        <div className="group/trends relative">
            <button
                type="button"
                aria-label="Produits précédents"
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
                aria-label="Produits suivants"
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
                    {ready.map((product, index) => (
                        <div
                            key={product.id}
                            className="min-w-0 shrink-0 grow-0 basis-[calc(50%-0.375rem)] sm:basis-[calc(33.333%-0.5rem)] md:basis-[calc(25%-0.5625rem)] lg:basis-[calc(20%-0.6rem)] xl:basis-[calc(16.666%-0.625rem)]"
                        >
                            <TrendProductCard product={product} aboveFold={index < 6} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
