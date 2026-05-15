'use client'

/**
 * Carte produit (grilles catalogue, favoris, etc.).
 *
 * Problèmes adressés :
 * 1) **Affichage seulement quand les données minimales sont cohérentes** — pas de `Link` vers `/product/undefined`
 *    ni de `.toLocaleString()` sur un prix manquant (évite page blanche / erreur jusqu'au refresh).
 * 2) **État de chargement explicite** — prop optionnelle `isLoading` ou produit encore incomplet → squelette
 *    aux mêmes dimensions (pas de saut de layout quand les données arrivent).
 * 3) **Données partielles** — libellés et image de repli sans casser le rendu.
 * 4) **Pas besoin de refresh pour voir la bonne image** — `key` sur `<img>` liée à `id` + URL effective pour forcer
 *    le remontage si le parent met à jour l'objet produit après coup (navigation client).
 * 5) **`<img>` natif** : URL Cloudinary directe (`res.cloudinary.com`) avec `f_auto,q_auto` / vignette grille — **jamais** `/_next/image`.
 */

import Link from 'next/link'
import { debugImageSrc } from '@/lib/debugImageSrc'
import { withCloudinaryCatalogThumb } from '@/lib/cloudinaryImageUrl'
import { catalogImageUrl } from '@/lib/heroImageUrl'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { ShoppingBag, Flame, Sparkles, PackageX } from 'lucide-react'
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
    views_count?: number | null
    created_at?: string | null
    /** Prix barré — fonctionnalité pro/premium */
    compare_price?: number | null
}

export type ProductCardProps = {
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

/** Placeholder discret (réseau lent) : réserve l'espace sans bloc gris animé. */
function ProductCardEmptyPlaceholder() {
    return (
        <div
            className="relative bg-white dark:bg-stone-900 rounded-[1.75rem] overflow-hidden border border-stone-100 dark:border-stone-800"
            aria-busy="true"
            aria-label="Emplacement produit"
        >
            <div className="aspect-[4/5] bg-stone-50 dark:bg-stone-950 min-h-[140px]" />
            <div className="px-4 pt-3 pb-4 h-[72px]" />
        </div>
    )
}

/** Squelette : mêmes proportions que la carte finale pour éviter les CLS. */
function ProductCardSkeleton() {
    return (
        <div
            className="relative bg-white dark:bg-stone-900 rounded-[1.75rem] overflow-hidden border border-stone-100 dark:border-stone-800 animate-pulse"
            aria-busy="true"
            aria-label="Chargement du produit"
        >
            <div className="aspect-[4/5] bg-stone-200 dark:bg-stone-800" />
            <div className="px-4 pt-3 pb-4 space-y-2.5">
                <div className="h-2 w-16 bg-stone-200 dark:bg-stone-800 rounded-full" />
                <div className="h-3.5 w-[80%] bg-stone-200 dark:bg-stone-800 rounded-full" />
                <div className="flex justify-between items-center pt-1">
                    <div className="h-5 w-24 bg-stone-200 dark:bg-stone-800 rounded-full" />
                    <div className="h-9 w-9 bg-stone-200 dark:bg-stone-800 rounded-xl" />
                </div>
            </div>
        </div>
    )
}

/** Produit identifiable mais métadonnées encore insuffisantes — message discret sans lien cassé. */
function ProductCardPending() {
    return (
        <div
            className="relative bg-white dark:bg-stone-900 rounded-[1.75rem] overflow-hidden border border-dashed border-stone-200 dark:border-stone-700"
            aria-live="polite"
        >
            <div className="aspect-[4/5] bg-stone-100 dark:bg-stone-800 animate-pulse" />
            <div className="px-4 pt-3 pb-4 space-y-2">
                <div className="h-2 w-16 bg-stone-200 dark:bg-stone-800 rounded-full mx-auto animate-pulse" />
                <div className="h-3 w-28 bg-stone-200 dark:bg-stone-800 rounded-full mx-auto animate-pulse" />
            </div>
        </div>
    )
}

function ProductCardInner({
    product,
    aboveFold = false,
}: {
    product: ProductCardProduct
    aboveFold?: boolean
}) {
    const isOutOfStock = product.stock_quantity != null && product.stock_quantity <= 0
    const isNew = product.created_at
        ? Date.now() - new Date(product.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
        : false
    const hasPromo = isPromoActive(product as Parameters<typeof isPromoActive>[0])
    const basePrice = typeof product.price === 'number' && Number.isFinite(product.price) ? product.price : 0
    const promoPrice = hasPromo ? getPromoPrice(product as Parameters<typeof getPromoPrice>[0]) : basePrice
    const effectivePrice = hasPromo ? promoPrice : basePrice
    const timeRemaining = hasPromo ? getPromoTimeRemaining(product.promo_end_date) : ''
    const hasComparePrice = typeof product.compare_price === 'number' && product.compare_price > effectivePrice
    const discountPct = hasComparePrice ? Math.round((1 - effectivePrice / product.compare_price!) * 100) : 0

    const imageSrc = resolveImageSrc(product)
    const displayUrl = useMemo(() => catalogImageUrl(withCloudinaryCatalogThumb(imageSrc)), [imageSrc])
    const [imgBroken, setImgBroken] = useState(false)

    useEffect(() => { setImgBroken(false) }, [displayUrl])
    const onImgError = useCallback(() => { setImgBroken(true) }, [])
    const imgSrc = imgBroken ? PLACEHOLDER_IMG : displayUrl

    useEffect(() => { debugImageSrc('ProductCard', imgSrc) }, [imgSrc])

    const displayName = product.name?.trim() || 'Produit'
    const categoryLabel = product.category?.trim() || 'Collection'

    return (
        <Link
            href={`/product/${product.id}`}
            className="group relative bg-white dark:bg-stone-900 rounded-[1.75rem] overflow-hidden border border-stone-100/80 dark:border-stone-800/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none transition-all duration-300 motion-safe:hover:-translate-y-1 hover:shadow-[0_20px_48px_-8px_rgba(0,0,0,0.13)] dark:hover:shadow-[0_20px_48px_-8px_rgba(0,0,0,0.5)] hover:border-stone-200/80 dark:hover:border-stone-700/60 block cursor-pointer"
        >
            {/* ── Image ── */}
            <div className="relative aspect-[4/5] overflow-hidden bg-stone-100 dark:bg-stone-800">
                <img
                    key={`${product.id}-${imgSrc}`}
                    src={imgSrc}
                    alt={displayName}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.07]"
                    loading={aboveFold ? 'eager' : 'lazy'}
                    fetchPriority={aboveFold ? 'high' : undefined}
                    decoding="async"
                    onError={onImgError}
                />

                {/* Gradient overlay bas → lisibilité */}
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

                {/* Badges — top left */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                    {hasPromo && product.promo_percentage != null && (
                        <div className="inline-flex items-center gap-1 bg-red-500 text-white px-2.5 py-1 rounded-full shadow-md shadow-red-500/30">
                            <Flame size={9} strokeWidth={2.5} />
                            <span className="text-[10px] font-black tracking-wide">-{product.promo_percentage}%</span>
                        </div>
                    )}
                    {isNew && !hasPromo && (
                        <div className="inline-flex items-center gap-1 bg-emerald-500 text-white px-2.5 py-1 rounded-full shadow-md shadow-emerald-500/25">
                            <Sparkles size={9} strokeWidth={2.5} />
                            <span className="text-[10px] font-black">Nouveau</span>
                        </div>
                    )}
                    {isOutOfStock && (
                        <div className="inline-flex items-center gap-1 bg-stone-800/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-full">
                            <PackageX size={9} strokeWidth={2.5} />
                            <span className="text-[9px] font-black uppercase tracking-wide">Épuisé</span>
                        </div>
                    )}
                </div>

                {/* Badge réduction compare_price — bottom left */}
                {hasComparePrice && !hasPromo && (
                    <div className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
                        <Flame size={8} strokeWidth={2.5} />
                        -{discountPct}%
                    </div>
                )}

                {/* LikeButton — top right */}
                <div className="absolute top-3 right-3 z-20">
                    <LikeButton productId={product.id!} />
                </div>

                {/* Hover overlay — vue rapide */}
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>

            {/* ── Infos ── */}
            <div className="px-4 pt-3 pb-4">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-600 dark:text-amber-500 mb-1 truncate">
                    {categoryLabel}
                </p>
                <h3 className="text-[13px] font-bold text-stone-900 dark:text-stone-50 line-clamp-1 leading-snug mb-3">
                    {displayName}
                </h3>

                <div className="flex items-end justify-between gap-2">
                    <div className="min-w-0">
                        {/* Ancien prix barré */}
                        {(hasComparePrice || hasPromo) && (
                            <p className="text-[10px] text-stone-400 dark:text-stone-500 line-through leading-none mb-0.5">
                                {hasComparePrice
                                    ? `${product.compare_price!.toLocaleString('fr-FR')} FCFA`
                                    : `${basePrice.toLocaleString('fr-FR')} F`
                                }
                            </p>
                        )}
                        {/* Prix courant */}
                        <p className="text-[15px] font-black tracking-tight text-amber-700 dark:text-amber-400 leading-none">
                            {effectivePrice.toLocaleString('fr-FR')}
                            <span className="text-[10px] font-bold ml-1 text-amber-600 dark:text-amber-500">FCFA</span>
                        </p>
                        {hasPromo && timeRemaining && (
                            <p className="text-[9px] text-red-500 dark:text-red-400 font-bold mt-0.5 leading-none">
                                Expire dans {timeRemaining}
                            </p>
                        )}
                    </div>

                    {/* Bouton panier */}
                    <div className="flex-shrink-0 w-9 h-9 rounded-[0.75rem] bg-stone-100 dark:bg-stone-800 flex items-center justify-center transition-all duration-200 group-hover:bg-stone-900 dark:group-hover:bg-amber-500 group-hover:shadow-md">
                        <ShoppingBag
                            size={15}
                            className="text-stone-500 dark:text-stone-400 group-hover:text-white transition-colors duration-200"
                        />
                    </div>
                </div>
            </div>
        </Link>
    )
}

function ProductCard({ product, isLoading = false, aboveFold = false }: ProductCardProps) {
    if (isLoading) {
        return aboveFold ? <ProductCardEmptyPlaceholder /> : <ProductCardSkeleton />
    }
    if (product == null) {
        return aboveFold ? <ProductCardEmptyPlaceholder /> : <ProductCardSkeleton />
    }
    if (!isProductDisplayReady(product)) {
        return aboveFold ? <ProductCardEmptyPlaceholder /> : <ProductCardPending />
    }
    return <ProductCardInner product={product} aboveFold={aboveFold} />
}

const propsAreEqual = (prev: ProductCardProps, next: ProductCardProps) => {
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
        a.compare_price === b.compare_price &&
        a.img === b.img &&
        a.image_url === b.image_url &&
        JSON.stringify(a.images_gallery ?? null) === JSON.stringify(b.images_gallery ?? null) &&
        a.category === b.category &&
        a.stock_quantity === b.stock_quantity &&
        a.promo_percentage === b.promo_percentage &&
        a.promo_start_date === b.promo_start_date &&
        a.promo_end_date === b.promo_end_date &&
        a.created_at === b.created_at
    )
}

export default memo(ProductCard, propsAreEqual)
