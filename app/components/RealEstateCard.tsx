'use client'

import Link from 'next/link'
import { Heart } from 'lucide-react'
import CloudinaryImage from '@/app/components/CloudinaryImage'
import {
    parseListingExtras,
    formatRealEstatePriceLabel,
    type RealEstateListingExtrasV1,
} from '@/lib/realEstateListing'
import { isPromoActive, getPromoPrice } from '@/lib/promo'

type Props = {
    product: any
}

function surfaceLabel(extras: RealEstateListingExtrasV1): string | null {
    const v = extras.surfaceValue
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return null
    if (extras.surfaceUnit === 'ares') return `${v} ares`
    return `${v} m²`
}

export default function RealEstateCard({ product }: Props) {
    const extras = parseListingExtras(product.listing_extras)
    const hasPromo = isPromoActive(product)
    const displayPrice = hasPromo ? getPromoPrice(product) : Number(product.price ?? 0)
    const basePriceNum = Number(product.price ?? 0)
    const priceLabel = formatRealEstatePriceLabel(displayPrice, extras)

    const imgSrc =
        product.img ||
        product.image_url ||
        (product.images_gallery && product.images_gallery[0]) ||
        '/placeholder-image.svg'

    const isLocation = extras?.offerType === 'location'

    return (
        <div className="relative">
            <Link
                href={`/product/${product.id}`}
                className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:border-blue-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-blue-600 dark:hover:shadow-xl"
            >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <CloudinaryImage
                        src={imgSrc}
                        delivery="catalog"
                        alt={product.name || 'Annonce'}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    <div className="pointer-events-none absolute left-3 top-3 z-[1] flex max-w-[75%] flex-col gap-1.5">
                        {extras && (
                            <span
                                className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                                    extras.offerType === 'location'
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/80 dark:text-emerald-200'
                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/80 dark:text-blue-200'
                                }`}
                            >
                                {extras.offerType === 'location' ? 'Location' : 'Vente'}
                            </span>
                        )}
                        {hasPromo && (
                            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-black uppercase text-white">
                                🔥 PROMO -{product.promo_percentage}%
                            </span>
                        )}
                    </div>
                </div>

                <div className="border-t border-slate-100 p-4 dark:border-slate-800">
                    <div className="flex flex-wrap items-baseline gap-1.5 gap-y-0">
                        {hasPromo && (
                            <p className="w-full text-xs text-slate-400 line-through dark:text-slate-500">
                                {formatRealEstatePriceLabel(basePriceNum, extras)}
                            </p>
                        )}
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{priceLabel}</p>
                        {isLocation && extras && (
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">/mois</span>
                        )}
                    </div>

                    <h3 className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">{product.name}</h3>

                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        {extras && typeof extras.bedrooms === 'number' && extras.bedrooms > 0 && (
                            <span className="shrink-0">🛏 {extras.bedrooms} ch.</span>
                        )}
                        {extras && surfaceLabel(extras) && (
                            <span className="shrink-0">📐 {surfaceLabel(extras)}</span>
                        )}
                        {extras?.district?.trim() ? (
                            <span className="min-w-0 truncate">📍 {extras.district.trim()}</span>
                        ) : null}
                    </div>
                </div>
            </Link>

            <button
                type="button"
                aria-label="Ajouter aux favoris"
                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm ring-1 ring-slate-200/80 transition hover:bg-white hover:text-red-500 dark:bg-slate-900/90 dark:text-slate-300 dark:ring-slate-600 dark:hover:text-red-400"
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                }}
            >
                <Heart className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            </button>
        </div>
    )
}
