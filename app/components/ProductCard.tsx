'use client'

import Link from 'next/link'
import Image from 'next/image'
import { memo } from 'react'
import { ShoppingBag, Eye } from 'lucide-react'
import LikeButton from './LikeButton'
import { isPromoActive, getPromoPrice, getPromoTimeRemaining } from '@/lib/promo'

interface Product {
    id: string
    name: string
    price: number
    img?: string
    image_url?: string
    category?: string
    stock_quantity?: number
    promo_percentage?: number | null
    promo_start_date?: string | null
    promo_end_date?: string | null
}

function ProductCard({ product }: { product: Product }) {
    const isOutOfStock = product.stock_quantity != null && product.stock_quantity <= 0
    const hasPromo = isPromoActive(product)
    const promoPrice = hasPromo ? getPromoPrice(product) : product.price
    const timeRemaining = hasPromo ? getPromoTimeRemaining(product.promo_end_date) : ''

    return (
        <Link
            href={`/product/${product.id}`}
            className="group relative bg-white dark:bg-slate-900 rounded-[2rem] p-3 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-transparent hover:border-slate-100 dark:hover:border-slate-800 block"
        >
            {/* IMAGE CONTAINER */}
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-slate-100 dark:bg-slate-800">
                <Image
                    src={product.img || product.image_url || '/placeholder-image.svg'}
                    alt={product.name}
                    fill
                    // Grilles produits: 2 cols mobile, 3 cols tablette, 4 cols desktop
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    quality={70}
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* LIKE BUTTON */}
                <div className="absolute top-3 right-3 z-20">
                    <LikeButton productId={product.id} />
                </div>

                {/* BADGES */}
                <div className="absolute top-0 left-0 flex flex-col items-start gap-1.5 z-10">
                    {hasPromo && (
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

                {/* OVERLAY ACTION */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                    <div className="bg-white text-black p-3 rounded-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <Eye size={18} />
                    </div>
                </div>
            </div>

            {/* INFO CONTAINER */}
            <div className="mt-4 px-2 pb-2">
                <div className="flex justify-between items-start gap-2">
                    <div>
                        <p className="text-[10px] font-black uppercase text-orange-500 tracking-widest mb-1">
                            {product.category || 'Collection'}
                        </p>
                        <h3 className="text-sm font-black uppercase tracking-tighter leading-tight dark:text-white line-clamp-1">
                            {product.name}
                        </h3>
                    </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                    {hasPromo ? (
                        <div>
                            <p className="text-xs text-slate-400 line-through font-bold">
                                {product.price.toLocaleString('fr-FR')} F
                            </p>
                            <p className="text-lg font-black tracking-tighter text-red-500">
                                {promoPrice.toLocaleString('fr-FR')} <span className="text-[10px] ml-0.5">FCFA</span>
                            </p>
                            <p className="text-[9px] font-bold text-red-400 mt-0.5">
                                Expire dans {timeRemaining}
                            </p>
                        </div>
                    ) : (
                        <p className="text-lg font-black tracking-tighter dark:text-white">
                            {product.price.toLocaleString('fr-FR')} <span className="text-[10px] ml-0.5">FCFA</span>
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

const propsAreEqual = (prev: { product: Product }, next: { product: Product }) => {
    const a = prev.product
    const b = next.product

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
