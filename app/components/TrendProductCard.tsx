'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { withCloudinaryCatalogThumb } from '@/lib/cloudinaryImageUrl'
import { isPromoActive, getPromoPrice } from '@/lib/promo'
import { normalizeProductImageUrl } from '@/lib/resolveProductImageUrl'
import type { ProductCardProduct } from '@/app/components/ProductCard'
import { getProductShopLabel } from '@/lib/productShopLabel'

const PLACEHOLDER_IMG = '/placeholder-image.svg'

function firstGalleryUrl(g: unknown): string {
    if (!Array.isArray(g) || g.length === 0) return ''
    const first = g[0]
    return typeof first === 'string' ? first.trim() : ''
}

function resolveImageSrc(p: ProductCardProduct): string {
    const candidates = [p.img, p.image_url, firstGalleryUrl(p.images_gallery)]
    for (const c of candidates) {
        const t = (c || '').trim()
        if (!t) continue
        const url = normalizeProductImageUrl(t)
        if (url.length > 0) return url
    }
    return PLACEHOLDER_IMG
}

function FiveGoldStars() {
    return (
        <div className="flex shrink-0 items-center gap-px" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
                <svg
                    key={i}
                    className="h-3 w-3 text-[#eab308]"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
            ))}
        </div>
    )
}

export type TrendProductCardProps = {
    product: ProductCardProduct
    aboveFold?: boolean
}

export default function TrendProductCard({ product, aboveFold = false }: TrendProductCardProps) {
    const hasPromo = isPromoActive(product as Parameters<typeof isPromoActive>[0])
    const basePrice = typeof product.price === 'number' && Number.isFinite(product.price) ? product.price : 0
    const promoPrice = hasPromo ? getPromoPrice(product as Parameters<typeof getPromoPrice>[0]) : basePrice
    const imageSrc = resolveImageSrc(product)
    const displayUrl = useMemo(() => withCloudinaryCatalogThumb(imageSrc), [imageSrc])
    const [imgBroken, setImgBroken] = useState(false)

    useEffect(() => {
        setImgBroken(false)
    }, [displayUrl])

    const onImgError = useCallback(() => {
        setImgBroken(true)
    }, [])

    const imgSrc = imgBroken ? PLACEHOLDER_IMG : displayUrl
    const displayName = product.name?.trim() || 'Produit'
    const shopLabel = getProductShopLabel(product)
    const views = typeof product.views_count === 'number' && Number.isFinite(product.views_count) ? product.views_count : 0
    const socialLabel =
        views > 0 ? `${views.toLocaleString('fr-FR')} vues` : 'Nouveau sur Mayombe'

    return (
        <Link
            href={`/product/${product.id}`}
            className="flex h-full min-h-0 flex-col rounded-xl border border-neutral-200/90 bg-white p-3 shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900"
        >
            <div className="relative aspect-square overflow-hidden rounded-lg bg-white dark:bg-neutral-950">
                <img
                    key={`${product.id}-${imgSrc}`}
                    src={imgSrc}
                    alt={displayName}
                    className="absolute inset-0 h-full w-full object-contain object-center"
                    loading={aboveFold ? 'eager' : 'lazy'}
                    fetchPriority={aboveFold ? 'high' : undefined}
                    decoding="async"
                    onError={onImgError}
                />
            </div>

            <div className="mt-3 flex min-h-0 flex-1 flex-col">
                <h3 className="line-clamp-2 min-h-[2.5rem] text-left text-[13px] font-semibold leading-snug tracking-tight text-neutral-900 dark:text-neutral-100">
                    {displayName}
                </h3>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <FiveGoldStars />
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{socialLabel}</span>
                </div>

                <p className="mt-2 truncate text-[11px] font-semibold leading-snug text-neutral-800 dark:text-neutral-200">
                    {shopLabel}
                </p>

                <div className="mt-auto pt-3">
                    {hasPromo ? (
                        <div className="space-y-0.5">
                            <p className="text-[11px] text-neutral-500">
                                <span className="line-through">{basePrice.toLocaleString('fr-FR')} FCFA</span>
                                <span className="ml-1.5 text-neutral-400">Prix indicatif</span>
                            </p>
                            <p className="text-xl font-bold tabular-nums text-red-600 dark:text-red-500">
                                {promoPrice.toLocaleString('fr-FR')}{' '}
                                <span className="text-sm font-bold">FCFA</span>
                            </p>
                        </div>
                    ) : (
                        <p className="text-xl font-bold tabular-nums text-red-600 dark:text-red-500">
                            {basePrice.toLocaleString('fr-FR')}{' '}
                            <span className="text-sm font-bold">FCFA</span>
                        </p>
                    )}
                </div>
            </div>
        </Link>
    )
}
