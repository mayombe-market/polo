'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/hooks/userCart'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { isBuyerProfileCompleteForOrder } from '@/lib/buyerProfileGate'
import { ArrowRight, Loader2 } from 'lucide-react'
import AuthModal from './AuthModal'
import CompleteProfileGateModal from './CompleteProfileGateModal'

interface OrderActionProps {
    product: any
    shop: any
    user: any
    variantsComplete?: boolean
    onVariantsInvalid?: () => void
    quantity?: number
    selectedVariant?: { size: string; color: string }
}

export default function OrderAction({
    product,
    shop,
    user,
    variantsComplete = true,
    onVariantsInvalid,
    quantity: quantityProp = 1,
    selectedVariant,
}: OrderActionProps) {
    const router = useRouter()
    const { clearCart, addToCart, updateQuantity } = useCart()
    const [isAuthOpen, setIsAuthOpen] = useState(false)
    const [profileGateOpen, setProfileGateOpen] = useState(false)
    const [profileGateDetail, setProfileGateDetail] = useState<string | undefined>(undefined)
    const [loading, setLoading] = useState(false)

    const handleMainClick = async () => {
        if (variantsComplete === false) {
            onVariantsInvalid?.()
            return
        }
        if (!user) {
            setIsAuthOpen(true)
            return
        }

        setLoading(true)
        try {
            const supabase = getSupabaseBrowserClient()
            const { data: prof } = await supabase
                .from('profiles')
                .select('city, phone, whatsapp_number')
                .eq('id', user.id)
                .maybeSingle()

            if (!isBuyerProfileCompleteForOrder(prof)) {
                const missing: string[] = []
                if (!prof?.city?.trim()) missing.push('ville')
                if (!(prof?.phone?.trim() || prof?.whatsapp_number?.trim())) missing.push('téléphone ou WhatsApp')
                setProfileGateDetail(missing.length > 0 ? `Renseignez : ${missing.join(', ')}.` : undefined)
                setProfileGateOpen(true)
                return
            }

            const qty = Math.max(1, Math.min(99, Math.floor(Number(quantityProp)) || 1))

            // Vider le panier, puis ajouter uniquement ce produit
            await clearCart()
            const cartId = `${product.id}-${selectedVariant?.size || ''}-${selectedVariant?.color || ''}`
            await addToCart({
                id: cartId,
                product_id: product.id,
                name: product.name,
                price: product.price,
                img: product.img || product.image_url || '',
                seller_id: product.seller_id,
                selectedSize: selectedVariant?.size,
                selectedColor: selectedVariant?.color,
            })
            if (qty > 1) await updateQuantity(cartId, qty)

            router.push('/checkout')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <button
                onClick={handleMainClick}
                disabled={loading}
                className="w-full bg-orange-500 text-white py-4 rounded-[1.2rem] text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] disabled:opacity-60"
            >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <>Commander maintenant <ArrowRight size={16} /></>}
            </button>

            <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
            <CompleteProfileGateModal
                open={profileGateOpen}
                onClose={() => { setProfileGateOpen(false); setProfileGateDetail(undefined) }}
                detail={profileGateDetail}
            />
        </div>
    )
}
