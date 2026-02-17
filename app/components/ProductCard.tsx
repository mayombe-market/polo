'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ShoppingBag, Eye } from 'lucide-react'
import LikeButton from './LikeButton'

interface Product {
    id: string
    name: string
    price: number
    img?: string
    image_url?: string
    category?: string
    stock_quantity?: number
}

export default function ProductCard({ product }: { product: Product }) {
    const isOutOfStock = product.stock_quantity != null && product.stock_quantity <= 0

    return (
        <Link
            href={`/product/${product.id}`}
            className="group relative bg-white dark:bg-slate-900 rounded-[2rem] p-3 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-transparent hover:border-slate-100 dark:hover:border-slate-800 block"
        >
            {/* IMAGE CONTAINER */}
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-slate-100 dark:bg-slate-800">
                <Image
                    src={product.img || product.image_url || '/placeholder-image.jpg'}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* --- INSERTION ICI : BOUTON LIKE --- */}
                <div className="absolute top-3 right-3 z-20">
                    <LikeButton productId={product.id} />
                </div>

                {/* BADGES */}
                {isOutOfStock && (
                    <div className="absolute top-4 left-4 bg-red-500 text-white text-[8px] font-black uppercase px-3 py-1.5 rounded-full z-10 shadow-lg">
                        Épuisé
                    </div>
                )}

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
                    <p className="text-lg font-black tracking-tighter dark:text-white">
                        {product.price.toLocaleString('fr-FR')} <span className="text-[10px] ml-0.5">FCFA</span>
                    </p>

                    <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl group-hover:bg-black group-hover:text-white dark:group-hover:bg-orange-500 transition-colors">
                        <ShoppingBag size={16} />
                    </div>
                </div>
            </div>
        </Link>
    )
}