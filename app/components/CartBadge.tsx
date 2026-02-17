'use client'

import { useCart } from '@/hooks/userCart'
import { ShoppingBag } from 'lucide-react'
import Link from 'next/link'

export default function CartBadge() {
    const { itemCount } = useCart()

    return (
        <Link href="/cart" className="relative p-2 hover:bg-slate-100 rounded-full transition-all group">
            {/* L'icône du panier */}
            <ShoppingBag
                size={24}
                className="text-slate-700 group-hover:text-orange-500 transition-colors"
            />

            {/* Le petit rond orange avec le nombre */}
            {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white animate-in zoom-in duration-300">
                    {itemCount}
                </span>
            )}
        </Link>
    )
}