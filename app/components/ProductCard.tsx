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
 * 4) **Pas besoin de refresh pour voir la bonne image** — `key` sur `<Image>` liée à `id` + URL effective pour forcer
 *    le remontage si le parent met à jour l’objet produit après coup (cache Next/Image / navigation client).
 */

import Link from 'next/link'
import Image from 'next/image'
import { memo } from 'react'
import { ShoppingBag, Eye, Loader2 } from 'lucide-react'
import LikeButton from './LikeButton'
import { isPromoActive, getPromoPrice, getPromoTimeRemaining } from '@/lib/promo'

/** Données catalogue telles que renvoyées par Supabase / listes (champs souvent tous présents, parfois retardés). */
export interface ProductCardProduct {
    id?: string
    name?: string
    price?: number
    img?: string
    image_url?: string
    category?: string
    stock_quantity?: number
    promo_percentage?: number | null
    promo_start_date?: string | null
    promo_end_date?: string | null
}

export type ProductCardProps = {
    /** Objet produit ; peut être partiel tant que le parent indique `isLoading` ou avant hydratation des listes. */
    product?: ProductCardProduct | null
    /**
     * Si `true`, affiche uniquement le squelette (le parent contrôle le chargement).
     * Si `false` / omis, on déduit un état « pas encore prêt » à partir des champs obligatoires.
     */
    isLoading?: boolean
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

function resolveImageSrc(p: ProductCardProduct): string {
    const raw = (p.img || p.image_url || '').trim()
    return raw.length > 0 ? raw : PLACEHOLDER_IMG
}

/** Squelette : mêmes proportions que la carte finale pour éviter les CLS. */
function ProductCardSkeleton() {
    return (
        <div
            className="group relative bg-white dark:bg-slate-900 rounded-[2rem] p-3 border border-transparent animate-pulse"
            aria-busy="true"
            aria-label="Chargement du produit"
        >
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-slate-200 dark:bg-slate-800" />
            <div className="mt-4 px-2 pb-2 space-y-3">
                <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-4 w-[85%] bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="flex justify-between items-center mt-3">
                    <div className="h-6 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Loader2 className="w-7 h-7 text-orange-400/80 animate-spin" aria-hidden />
            </div>
        </div>
    )
}

/** Produit identifiable mais métadonnées encore insuffisantes — message discret sans lien cassé. */
function ProductCardPending() {
    return (
        <div
            className="group relative bg-white dark:bg-slate-900 rounded-[2rem] p-3 border border-dashed border-slate-200 dark:border-slate-700"
            aria-live="polite"
        >
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-slate-300 dark:text-slate-600 animate-spin" aria-hidden />
            </div>
            <div className="mt-4 px-2 pb-2 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Chargement…</p>
            </div>
        </div>
    )
}

function ProductCardInner({ product }: { product: ProductCardProduct }) {
    const isOutOfStock = product.stock_quantity != null && product.stock_quantity <= 0
    const hasPromo = isPromoActive(product as Parameters<typeof isPromoActive>[0])
    const basePrice = typeof product.price === 'number' && Number.isFinite(product.price) ? product.price : 0
    const promoPrice = hasPromo ? getPromoPrice(product as Parameters<typeof getPromoPrice>[0]) : basePrice
    const timeRemaining = hasPromo ? getPromoTimeRemaining(product.promo_end_date) : ''
    const imageSrc = resolveImageSrc(product)
    const displayName = product.name?.trim() || 'Produit'
    const categoryLabel = product.category?.trim() || 'Collection'

    return (
        <Link
            href={`/product/${product.id}`}
            className="group relative bg-white dark:bg-slate-900 rounded-[2rem] p-3 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-transparent hover:border-slate-100 dark:hover:border-slate-800 block"
        >
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-slate-100 dark:bg-slate-800">
                {/*
                  key = id + src : si le parent met à jour l’URL d’image après le 1er rendu (ex. données async),
                  Next/Image remonte correctement sans exiger un refresh de page entière.
                */}
                <Image
                    key={`${product.id}-${imageSrc}`}
                    src={imageSrc}
                    alt={displayName}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    quality={70}
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                />

                <div className="absolute top-3 right-3 z-20">
                    <LikeButton productId={product.id!} />
                </div>

                <div className="absolute top-0 left-0 flex flex-col items-start gap-1.5 z-10">
                    {hasPromo && product.promo_percentage != null && (
                        <div className="bg-red-600 text-white font-black uppercase shadow-lg rounded-tl-[1.5rem] rounded-br-2xl px-4 py-2.5 flex items-center gap-1.5">
                            <span className="text-[10px] md:text-xs tracking-wide">🔥 PROMO</span>
                            <span className="text-sm md:text-base font-black">-{product.promo_percentage}%</span>
                        </div>
                    )}
                    {isOutOfStock && (
                        <div className="bg-red-500 text-white text-[8px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg ml-4 mt-2">
                            Épuisé
                        </div>
                    )}
                </div>

                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                    <div className="bg-white text-black p-3 rounded-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <Eye size={18} />
                    </div>
                </div>
            </div>

            <div className="mt-4 px-2 pb-2">
                <div className="flex justify-between items-start gap-2">
                    <div>
                        <p className="text-[10px] font-black uppercase text-orange-500 tracking-widest mb-1">
                            {categoryLabel}
                        </p>
                        <h3 className="text-sm font-black uppercase tracking-tighter leading-tight dark:text-white line-clamp-1">
                            {displayName}
                        </h3>
                    </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                    {hasPromo ? (
                        <div>
                            <p className="text-xs text-slate-400 line-through font-bold">
                                {basePrice.toLocaleString('fr-FR')} F
                            </p>
                            <p className="text-lg font-black tracking-tighter text-red-500">
                                {promoPrice.toLocaleString('fr-FR')}{' '}
                                <span className="text-[10px] ml-0.5">FCFA</span>
                            </p>
                            {timeRemaining ? (
                                <p className="text-[9px] font-bold text-red-400 mt-0.5">Expire dans {timeRemaining}</p>
                            ) : null}
                        </div>
                    ) : (
                        <p className="text-lg font-black tracking-tighter dark:text-white">
                            {basePrice.toLocaleString('fr-FR')} <span className="text-[10px] ml-0.5">FCFA</span>
                        </p>
                    )}

                    <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl group-hover:bg-black group-hover:text-white dark:group-hover:bg-orange-500 transition-colors">
                        <ShoppingBag size={16} />
                    </div>
                </div>
            </div>
        </Link>
    )
}

function ProductCard({ product, isLoading = false }: ProductCardProps) {
    // 1) Chargement explicite côté parent
    if (isLoading) {
        return <ProductCardSkeleton />
    }

    // 2) Objet absent
    if (product == null) {
        return <ProductCardSkeleton />
    }

    // 3) Données encore incomplètes → pas de carte « vide » ni de lien invalide
    if (!isProductDisplayReady(product)) {
        return <ProductCardPending />
    }

    // 4) À ce stade id / name / price sont garantis pour l’affichage métier
    return <ProductCardInner product={product} />
}

const propsAreEqual = (prev: ProductCardProps, next: ProductCardProps) => {
    if (prev.isLoading !== next.isLoading) return false
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
        a.category === b.category &&
        a.stock_quantity === b.stock_quantity &&
        a.promo_percentage === b.promo_percentage &&
        a.promo_start_date === b.promo_start_date &&
        a.promo_end_date === b.promo_end_date
    )
}

export default memo(ProductCard, propsAreEqual)
