'use client'

/**
 * Carte produit (grilles catalogue, favoris, etc.).
 *
 * Problèmes adressés :
 * 1) **Affichage seulement quand les données minimales sont cohérentes** — pas de `Link` vers `/product/undefined`
 *    ni de `.toLocaleString()` sur un prix manquant (évite page blanche / erreur jusqu’au refresh).
 * 2) **État de chargement explicite** — prop optionnelle `isLoading` ou produit encore incomplet → squelette
 *    aux mêmes dimensions (pas de saut de layout quand les données arrivent).
 * 3) **Données partielles** — libellés et image de repli sans casser le rendu.
 * 4) **Pas besoin de refresh pour voir la bonne image** — `key` sur `<img>` liée à `id` + URL effective pour forcer
 *    le remontage si le parent met à jour l’objet produit après coup (navigation client).
 * 5) **`<img>` natif** : URL Cloudinary directe (`res.cloudinary.com`) avec `f_auto,q_auto` / vignette grille — **jamais** `/_next/image`.
 */

import Link from 'next/link'
import { debugImageSrc } from '@/lib/debugImageSrc'
import { withCloudinaryCatalogThumb } from '@/lib/cloudinaryImageUrl'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import LikeButton from './LikeButton'
import { isPromoActive, getPromoPrice, getPromoTimeRemaining } from '@/lib/promo'
import { normalizeProductImageUrl } from '@/lib/resolveProductImageUrl'
import { getProductShopLabel } from '@/lib/productShopLabel'

/** Données catalogue telles que renvoyées par Supabase / listes (champs souvent tous présents, parfois retardés). */
export interface ProductCardProduct {
    id?: string
    name?: string
    price?: number
    img?: string
    image_url?: string
    /** Si `img` est vide côté base, première miniature éventuelle (aligné page catégorie). */
    images_gallery?: string[] | null
    category?: string
    stock_quantity?: number
    promo_percentage?: number | null
    promo_start_date?: string | null
    promo_end_date?: string | null
    /** Présent sur les listes triées par popularité (home tendances, etc.). */
    views_count?: number | null
    /** Nom boutique affiché sur la fiche produit / vendeur (dénormalisé). */
    shop?: string | null
    store_name?: string | null
    shop_name?: string | null
    /** Jointure Supabase `profiles` via `seller_id` (optionnel). */
    profiles?:
        | { store_name?: string | null; shop_name?: string | null; full_name?: string | null; name?: string | null }
        | { store_name?: string | null; shop_name?: string | null; full_name?: string | null; name?: string | null }[]
        | null
}

/** `editorial` = style vitrine type catalogue luxe (titres nets, peu de décor). */
export type ProductCardTone = 'default' | 'editorial'

export type ProductCardProps = {
    /** Classes optionnelles sur le lien carte (grilles, sections) — UI uniquement. */
    className?: string
    /** Style visuel de la carte (n’impacte pas les données ni les liens). */
    tone?: ProductCardTone
    /** Objet produit ; peut être partiel tant que le parent indique `isLoading` ou avant hydratation des listes. */
    product?: ProductCardProduct | null
    /**
     * Si `true`, affiche uniquement le squelette (le parent contrôle le chargement).
     * Si `false` / omis, on déduit un état « pas encore prêt » à partir des champs obligatoires.
     */
    isLoading?: boolean
    /**
     * Premiers emplacements (ex. 10 premiers) : pas de squelette gris — cadre vide qui se remplit ;
     * image en `loading="eager"` une fois les données là.
     */
    aboveFold?: boolean
}

const PLACEHOLDER_IMG = '/placeholder-image.svg'

/** Champs minimum pour considérer la carte comme « prête » (contenu métier, pas seulement un id technique). */
function isProductDisplayReady(p: ProductCardProduct | null | undefined): boolean {
    if (!p || typeof p !== 'object') return false
    const id = typeof p.id === 'string' && p.id.trim().length > 0
    const name = typeof p.name === 'string' && p.name.trim().length > 0
    const price = typeof p.price === 'number' && Number.isFinite(p.price)
    return id && name && price
}

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

/** Placeholder discret (réseau lent) : réserve l’espace sans bloc gris animé. */
function ProductCardEmptyPlaceholder() {
    return (
        <div
            className="group relative rounded-xl border border-neutral-200/80 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900"
            aria-busy="true"
            aria-label="Emplacement produit"
        >
            <div className="relative aspect-square min-h-[120px] overflow-hidden rounded-lg bg-white dark:bg-slate-950" />
            <div className="mt-4 px-2 pb-2 h-14" />
        </div>
    )
}

/** Squelette : mêmes proportions que la carte finale pour éviter les CLS. */
function ProductCardSkeleton() {
    return (
        <div
            className="group relative animate-pulse rounded-xl border border-neutral-200/80 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900"
            aria-busy="true"
            aria-label="Chargement du produit"
        >
            <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="mt-4 space-y-2 px-0.5 pb-2">
                <div className="h-2.5 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-4 w-[90%] bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-3" />
            </div>
        </div>
    )
}

/** Produit identifiable mais métadonnées encore insuffisantes — message discret sans lien cassé. */
function ProductCardPending() {
    return (
        <div
            className="group relative rounded-xl border border-dashed border-neutral-300 bg-white p-3 dark:border-neutral-600 dark:bg-neutral-900"
            aria-live="polite"
        >
            <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="mt-4 px-2 pb-2 space-y-2">
                <div className="h-2 w-20 bg-slate-200 dark:bg-slate-800 rounded mx-auto animate-pulse" />
                <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded mx-auto animate-pulse" />
            </div>
        </div>
    )
}

function ProductCardInner({
    product,
    aboveFold = false,
    className,
    tone = 'default',
}: {
    product: ProductCardProduct
    aboveFold?: boolean
    className?: string
    tone?: ProductCardTone
}) {
    const isOutOfStock = product.stock_quantity != null && product.stock_quantity <= 0
    const hasPromo = isPromoActive(product as Parameters<typeof isPromoActive>[0])
    const basePrice = typeof product.price === 'number' && Number.isFinite(product.price) ? product.price : 0
    const promoPrice = hasPromo ? getPromoPrice(product as Parameters<typeof getPromoPrice>[0]) : basePrice
    const timeRemaining = hasPromo ? getPromoTimeRemaining(product.promo_end_date) : ''
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

    useEffect(() => {
        debugImageSrc('ProductCard', imgSrc)
    }, [imgSrc])

    const displayName = product.name?.trim() || 'Produit'
    const shopLabel = getProductShopLabel(product)
    const editorial = tone === 'editorial'

    const cardShell =
        'group relative block rounded-xl border border-neutral-200/80 bg-white p-3 transition-shadow duration-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900'

    return (
        <Link href={`/product/${product.id}`} className={[cardShell, className].filter(Boolean).join(' ')}>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-white dark:bg-neutral-950">
                {/*
                  key = id + src : si le parent met à jour l’URL d’image après le 1er rendu (ex. données async),
                  le navigateur recharge la vignette sans refresh de page entière.
                */}
                <img
                    key={`${product.id}-${imgSrc}`}
                    src={imgSrc}
                    alt={displayName}
                    className="absolute inset-0 h-full w-full object-contain object-center transition-transform duration-300 group-hover:scale-[1.02]"
                    loading={aboveFold ? 'eager' : 'lazy'}
                    fetchPriority={aboveFold ? 'high' : undefined}
                    decoding="async"
                    onError={onImgError}
                />

                {!editorial && (
                    <div className="absolute top-2 right-2 z-20">
                        <LikeButton productId={product.id!} />
                    </div>
                )}

                <div className="absolute top-0 left-0 z-10 flex flex-col items-start gap-1.5">
                    {hasPromo && product.promo_percentage != null && (
                        <div className="bg-[#2563eb] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white">
                            -{product.promo_percentage}%
                        </div>
                    )}
                    {isOutOfStock && (
                        <div className="ml-1 mt-0.5 bg-neutral-800 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white">
                            Épuisé
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-3 text-left">
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                    {shopLabel}
                </p>
                <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-neutral-900 dark:text-neutral-100">
                    {displayName}
                </h3>

                <div className="mt-2 flex w-full flex-col items-start gap-0.5">
                    {hasPromo ? (
                        <>
                            <p className="text-[11px] text-neutral-400 line-through dark:text-neutral-500">
                                {basePrice.toLocaleString('fr-FR')} FCFA
                            </p>
                            <p className="text-base font-bold tabular-nums tracking-tight text-red-600 dark:text-red-500">
                                {promoPrice.toLocaleString('fr-FR')}{' '}
                                <span className="text-xs font-bold">FCFA</span>
                            </p>
                            {timeRemaining && !editorial ? (
                                <p className="text-[9px] font-semibold text-red-500 dark:text-red-400">
                                    Expire dans {timeRemaining}
                                </p>
                            ) : null}
                        </>
                    ) : (
                        <p className="text-base font-bold tabular-nums tracking-tight text-red-600 dark:text-red-500">
                            {basePrice.toLocaleString('fr-FR')}{' '}
                            <span className="text-xs font-bold">FCFA</span>
                        </p>
                    )}
                </div>
            </div>
        </Link>
    )
}

function ProductCard({
    product,
    isLoading = false,
    aboveFold = false,
    className,
    tone = 'default',
}: ProductCardProps) {
    // 1) Chargement explicite côté parent
    if (isLoading) {
        return aboveFold ? <ProductCardEmptyPlaceholder /> : <ProductCardSkeleton />
    }

    // 2) Objet absent
    if (product == null) {
        return aboveFold ? <ProductCardEmptyPlaceholder /> : <ProductCardSkeleton />
    }

    // 3) Données encore incomplètes → pas de carte « vide » ni de lien invalide
    if (!isProductDisplayReady(product)) {
        return aboveFold ? <ProductCardEmptyPlaceholder /> : <ProductCardPending />
    }

    // 4) À ce stade id / name / price sont garantis pour l’affichage métier
    return <ProductCardInner product={product} aboveFold={aboveFold} className={className} tone={tone} />
}

const propsAreEqual = (prev: ProductCardProps, next: ProductCardProps) => {
    if (prev.tone !== next.tone) return false
    if (prev.className !== next.className) return false
    if (prev.isLoading !== next.isLoading) return false
    if (prev.aboveFold !== next.aboveFold) return false
    if (prev.isLoading || next.isLoading) return prev.isLoading === next.isLoading

    const a = prev.product
    const b = next.product
    if (a === b) return true
    if (!a || !b) return false

    return (
        a.id === b.id &&
        a.name === b.name &&
        a.price === b.price &&
        a.img === b.img &&
        a.image_url === b.image_url &&
        JSON.stringify(a.images_gallery ?? null) === JSON.stringify(b.images_gallery ?? null) &&
        a.category === b.category &&
        a.stock_quantity === b.stock_quantity &&
        a.promo_percentage === b.promo_percentage &&
        a.promo_start_date === b.promo_start_date &&
        a.promo_end_date === b.promo_end_date &&
        a.shop === b.shop &&
        a.store_name === b.store_name &&
        a.shop_name === b.shop_name
    )
}

export default memo(ProductCard, propsAreEqual)
