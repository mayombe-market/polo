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
import { ShoppingBag, Eye } from 'lucide-react'
import LikeButton from './LikeButton'
import { isPromoActive, getPromoPrice, getPromoTimeRemaining } from '@/lib/promo'
import { normalizeProductImageUrl } from '@/lib/resolveProductImageUrl'

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
            className="group relative bg-white dark:bg-slate-900 rounded-[2rem] p-3 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none"
            aria-busy="true"
            aria-label="Emplacement produit"
        >
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-white dark:bg-slate-950 min-h-[140px]" />
            <div className="mt-4 px-2 pb-2 h-14" />
        </div>
    )
}

/** Squelette : mêmes proportions que la carte finale pour éviter les CLS. */
function ProductCardSkeleton() {
    return (
        <div
            className="group relative bg-white dark:bg-slate-900 rounded-[2rem] p-3 border border-slate-100 dark:border-slate-800 animate-pulse"
            aria-busy="true"
            aria-label="Chargement du produit"
        >
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-slate-200 dark:bg-slate-800" />
            <div className="mt-4 px-2 pb-2 space-y-3">
                <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-4 w-[85%] bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="flex justify-between items-center mt-3">
                    <div className="h-6 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
                </div>
            </div>
        </div>
    )
}

/** Produit identifiable mais métadonnées encore insuffisantes — message discret sans lien cassé. */
function ProductCardPending() {
    return (
        <div
            className="group relative bg-white dark:bg-slate-900 rounded-[2rem] p-3 border border-dashed border-slate-200 dark:border-slate-600"
            aria-live="polite"
        >
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-slate-200 dark:bg-slate-800 animate-pulse" />
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
    const categoryLabel = product.category?.trim() || 'Collection'
    const editorial = tone === 'editorial'

    return (
        <Link
            href={`/product/${product.id}`}
            className={[
                editorial
                    ? 'group relative block border border-neutral-200/80 bg-white p-0 transition-shadow duration-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900'
                    : 'group relative bg-white dark:bg-slate-900 rounded-[2rem] p-3 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 block',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <div
                className={
                    editorial
                        ? 'relative aspect-[4/5] overflow-hidden bg-neutral-50 dark:bg-neutral-800'
                        : 'relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-slate-100 dark:bg-slate-800'
                }
            >
                {/*
                  key = id + src : si le parent met à jour l’URL d’image après le 1er rendu (ex. données async),
                  le navigateur recharge la vignette sans refresh de page entière.
                */}
                <img
                    key={`${product.id}-${imgSrc}`}
                    src={imgSrc}
                    alt={displayName}
                    className={
                        editorial
                            ? 'absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
                            : 'absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110'
                    }
                    loading={aboveFold ? 'eager' : 'lazy'}
                    fetchPriority={aboveFold ? 'high' : undefined}
                    decoding="async"
                    onError={onImgError}
                />

                {!editorial && (
                    <div className="absolute top-3 right-3 z-20">
                        <LikeButton productId={product.id!} />
                    </div>
                )}

                <div className="absolute top-0 left-0 z-10 flex flex-col items-start gap-1.5">
                    {hasPromo && product.promo_percentage != null && (
                        <div
                            className={
                                editorial
                                    ? 'bg-[#2563eb] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white'
                                    : 'flex items-center gap-1.5 rounded-br-2xl rounded-tl-[1.5rem] bg-red-600 px-4 py-2.5 font-black uppercase text-white shadow-lg'
                            }
                        >
                            {editorial ? (
                                <span>-{product.promo_percentage}%</span>
                            ) : (
                                <>
                                    <span className="text-[10px] tracking-wide md:text-xs">🔥 PROMO</span>
                                    <span className="text-sm font-black md:text-base">-{product.promo_percentage}%</span>
                                </>
                            )}
                        </div>
                    )}
                    {isOutOfStock && (
                        <div
                            className={
                                editorial
                                    ? 'ml-2 mt-1 bg-neutral-800 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white'
                                    : 'ml-4 mt-2 rounded-full bg-red-500 px-3 py-1.5 text-[8px] font-black uppercase text-white shadow-lg'
                            }
                        >
                            Épuisé
                        </div>
                    )}
                </div>

                {!editorial && (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <div className="translate-y-4 transform rounded-full bg-white p-3 text-black transition-transform duration-300 group-hover:translate-y-0">
                            <Eye size={18} />
                        </div>
                    </div>
                )}
            </div>

            <div className={editorial ? 'px-3 py-4 text-center sm:px-4' : 'mt-4 px-2 pb-2'}>
                <div className="flex items-start justify-between gap-2">
                    <div className={editorial ? 'min-w-0 flex-1 text-center' : ''}>
                        <p
                            className={
                                editorial
                                    ? 'mb-1.5 text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-400'
                                    : 'mb-1 text-[10px] font-black uppercase tracking-widest text-orange-500'
                            }
                        >
                            {categoryLabel}
                        </p>
                        <h3
                            className={
                                editorial
                                    ? 'line-clamp-2 text-sm font-medium leading-snug tracking-normal text-neutral-800 dark:text-neutral-100'
                                    : 'line-clamp-1 text-sm font-black uppercase leading-tight tracking-tighter text-slate-900 dark:text-slate-50'
                            }
                        >
                            {displayName}
                        </h3>
                    </div>
                </div>

                <div
                    className={
                        editorial
                            ? 'mt-3 flex flex-col items-center justify-center gap-0.5'
                            : 'mt-3 flex items-center justify-between'
                    }
                >
                    {hasPromo ? (
                        <div className={editorial ? 'text-center' : ''}>
                            {!editorial && (
                                <p className="text-xs font-bold text-slate-500 line-through dark:text-slate-400">
                                    {basePrice.toLocaleString('fr-FR')} F
                                </p>
                            )}
                            <p
                                className={
                                    editorial
                                        ? 'text-sm font-bold tabular-nums text-red-600 dark:text-red-500'
                                        : 'text-lg font-black tracking-tighter text-red-600 dark:text-red-400'
                                }
                            >
                                {hasPromo ? promoPrice.toLocaleString('fr-FR') : basePrice.toLocaleString('fr-FR')}{' '}
                                <span
                                    className={
                                        editorial
                                            ? 'text-xs font-bold text-red-600 dark:text-red-500'
                                            : 'ml-0.5 text-[10px] font-black text-red-600 dark:text-red-400'
                                    }
                                >
                                    FCFA
                                </span>
                            </p>
                            {editorial && (
                                <p className="text-[11px] text-neutral-400 line-through">
                                    {basePrice.toLocaleString('fr-FR')} FCFA
                                </p>
                            )}
                            {timeRemaining && !editorial ? (
                                <p className="mt-0.5 text-[9px] font-bold text-red-500 dark:text-red-300">
                                    Expire dans {timeRemaining}
                                </p>
                            ) : null}
                        </div>
                    ) : (
                        <p
                            className={
                                editorial
                                    ? 'text-sm font-bold tabular-nums text-red-600 dark:text-red-500'
                                    : 'text-lg font-black tracking-tighter text-red-600 dark:text-red-400'
                            }
                        >
                            {basePrice.toLocaleString('fr-FR')}{' '}
                            <span
                                className={
                                    editorial
                                        ? 'text-xs font-bold text-red-600 dark:text-red-500'
                                        : 'ml-0.5 text-[10px] font-black text-red-600 dark:text-red-400'
                                }
                            >
                                FCFA
                            </span>
                        </p>
                    )}

                    {!editorial && (
                        <div className="rounded-xl bg-slate-50 p-2.5 transition-colors group-hover:bg-black group-hover:text-white dark:bg-slate-800 dark:group-hover:bg-orange-500">
                            <ShoppingBag size={16} />
                        </div>
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
        a.promo_end_date === b.promo_end_date
    )
}

export default memo(ProductCard, propsAreEqual)
