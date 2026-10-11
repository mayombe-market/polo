'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { FEATURES } from '@/lib/featureFlags'
import { useCart } from '@/hooks/userCart'
import AuthModal from './AuthModal'

interface OrderActionProps {
    product: any
    shop: any
    user: any
    /** false si couleur/taille requises mais non choisies */
    variantsComplete?: boolean
    onVariantsInvalid?: () => void
    /** @deprecated non utilisé depuis l'unification du checkout */
    quantity?: number
    /** Variantes sélectionnées (couleur / taille) */
    selectedVariant?: { size: string; color: string }
}

export default function OrderAction({
    product,
    shop,
    user,
    variantsComplete = true,
    onVariantsInvalid,
    selectedVariant,
}: OrderActionProps) {
    const [isAuthOpen, setIsAuthOpen] = useState(false)
    const router = useRouter()
    const { addToCart } = useCart()

    const handleMainClick = async () => {
        if (variantsComplete === false) {
            onVariantsInvalid?.()
            return
        }

        if (!user && !FEATURES.guestCheckout) {
            setIsAuthOpen(true)
            return
        }

        await addToCart({
            id: `${product.id}`,
            product_id: product.id,
            name: product.name,
            price: product.price,
            img: product.images?.[0] || product.img || '',
            seller_id: product.seller_id,
            shop_type: shop?.vendor_type || null,
            ...(selectedVariant?.color ? { selectedColor: selectedVariant.color } : {}),
            ...(selectedVariant?.size ? { selectedSize: selectedVariant.size } : {}),
        })

        void (async () => {
            const [{ captureAnalyticsContext }, { trackEvent }] = await Promise.all([
                import('@/lib/analytics'),
                import('@/app/actions/analytics'),
            ])
            const ctx = captureAnalyticsContext()
            void trackEvent({
                shop_id: shop?.id || product?.seller_id,
                product_id: product?.id ?? null,
                event_type: 'checkout_start',
                session_id: ctx.session_id,
                source: ctx.source,
                utm_source: ctx.utm_source,
                utm_medium: ctx.utm_medium,
                utm_campaign: ctx.utm_campaign,
            })
        })()

        router.push('/checkout')
    }

    return (
        <div>
            <button
                onClick={handleMainClick}
                className="w-full bg-orange-500 text-white py-4 rounded-[1.2rem] text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98]"
            >
                Commander maintenant <ArrowRight size={16} />
            </button>

            <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
        </div>
    )
}
