'use client'

import { useCart } from '@/hooks/userCart' // Correction du nom de l'import
import { ShoppingCart, Check, AlertCircle } from 'lucide-react'
import { useState } from 'react'

interface Props {
    product: {
        id: string
        name: string
        price: number
        seller_id?: string
        img?: string
        image_url?: string
        has_variants?: boolean
        sizes?: string[]
        colors?: string[]
        has_stock?: boolean
        stock_quantity?: number
    },
    // On ajoute la prop pour recevoir les choix de l'utilisateur
    selectedVariant?: {
        size: string
        color: string
    }
}

export default function AddToCartButton({ product, selectedVariant }: Props) {
    const { addToCart } = useCart()
    const [status, setStatus] = useState<'idle' | 'added' | 'error'>('idle')

    const handleAdd = () => {
        // 1. VÉRIFICATION DES VARIANTES
        if (product.has_variants) {
            const needsSize = product.sizes && product.sizes.length > 0 && !selectedVariant?.size
            const needsColor = product.colors && product.colors.length > 0 && !selectedVariant?.color

            if (needsSize || needsColor) {
                setStatus('error')
                alert(`Veuillez choisir ${needsSize ? 'une taille' : ''}${needsSize && needsColor ? ' et ' : ''}${needsColor ? 'une couleur' : ''}`)
                setTimeout(() => setStatus('idle'), 2000)
                return
            }
        }

        // 2. AJOUT AU PANIER AVEC INFOS DÉTAILLÉES
        addToCart({
            id: `${product.id}-${selectedVariant?.size || ''}-${selectedVariant?.color || ''}`,
            product_id: product.id,
            name: product.name,
            price: product.price,
            img: product.img || product.image_url || '',
            seller_id: product.seller_id,    // ← ajouter
            selectedSize: selectedVariant?.size,
            selectedColor: selectedVariant?.color
        })


        setStatus('added')
        setTimeout(() => setStatus('idle'), 2000)
    }

    // Gestion du stock épuisé
    const isOutOfStock = product.has_stock && product.stock_quantity! <= 0

    return (
        <button
            onClick={handleAdd}
            disabled={isOutOfStock || status === 'added'}
            className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${status === 'added'
                ? 'bg-green-600 text-white shadow-lg shadow-green-200'
                : status === 'error'
                    ? 'bg-red-500 text-white animate-bounce'
                    : isOutOfStock
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-orange-500 text-white shadow-lg shadow-orange-200 hover:bg-black'
                }`}
        >
            {isOutOfStock ? (
                "Rupture de stock"
            ) : status === 'added' ? (
                <>
                    <Check size={18} />
                    Ajouté !
                </>
            ) : status === 'error' ? (
                <>
                    <AlertCircle size={18} />
                    Options manquantes
                </>
            ) : (
                <>
                    <ShoppingCart size={18} />
                    Ajouter au panier
                </>
            )}
        </button>
    )
}