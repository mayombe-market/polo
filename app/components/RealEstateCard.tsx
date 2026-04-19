'use client'

import Link from 'next/link'
import { Heart } from 'lucide-react'
import CloudinaryImage from '@/app/components/CloudinaryImage'
import {
    parseListingExtras,
    formatRealEstatePriceLabel,
    IMMO_SUBCATEGORY_BADGES,
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

    // Badge : d'abord match exact sur la sous-catégorie, sinon match flou
    // (contient le nom singulier/pluriel), sinon fallback générique "Bien".
    // Objectif : TOUTES les cartes immobilier affichent un badge.
    const resolveBadge = () => {
        const raw = (product.subcategory || '').trim()
        const exact = IMMO_SUBCATEGORY_BADGES[raw]
        if (exact) return exact
        const lower = raw.toLowerCase()
        if (lower) {
            for (const [key, value] of Object.entries(IMMO_SUBCATEGORY_BADGES)) {
                const k = key.toLowerCase()
                const singular = k.replace(/s$/, '')
                if (lower.includes(k) || lower.includes(singular)) return value
            }
        }
        // Fallback offre location vs vente
        if (extras?.offerType === 'location') return IMMO_SUBCATEGORY_BADGES['Locations']
        return {
            label: 'Bien',
            bg: 'bg-slate-100',
            text: 'text-slate-700',
            darkBg: 'dark:bg-slate-800',
            darkText: 'dark:text-slate-200',
        }
    }
    const subBadge = resolveBadge()

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
                        <span
                            className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ${subBadge.bg} ${subBadge.text} ${subBadge.darkBg} ${subBadge.darkText}`}
                        >
                            {subBadge.label}
                        </span>
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

                    <div className="mt-2 flex flex-wrap items-center gap-x-1 text-xs text-slate-500 dark:text-slate-400">
                        {(() => {
                            const chips: string[] = []
                            if (extras && typeof extras.bedrooms === 'number' && extras.bedrooms > 0)
                                chips.push(`🛏 ${extras.bedrooms} ch.`)
                            if (extras && surfaceLabel(extras))
                                chips.push(`📐 ${surfaceLabel(extras)}`)
                            if (extras?.district?.trim())
                                chips.push(`📍 ${extras.district.trim()}`)
                            return chips.slice(0, 3).map((c, i) => (
                                <span key={i} className="shrink-0 truncate">
                                    {i > 0 && <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>}
                                    {c}
                                </span>
                            ))
                        })()}
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
