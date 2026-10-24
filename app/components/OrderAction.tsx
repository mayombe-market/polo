'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2 } from 'lucide-react'
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
    /** Quantité choisie sur la fiche produit (défaut 1) */
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
    quantity: quantityProp = 1,
    selectedVariant,
}: OrderActionProps) {
    const [isAuthOpen, setIsAuthOpen] = useState(false)
    const [busy, setBusy] = useState(false)
    const busyRef = useRef(false)
    const router = useRouter()
    const { cart, addToCart, updateQuantity } = useCart()

    const handleMainClick = async () => {
        if (busyRef.current) return
        if (variantsComplete === false) {
            onVariantsInvalid?.()
            return
        }

        if (!user && !FEATURES.guestCheckout) {
            setIsAuthOpen(true)
            return
        }

        busyRef.current = true
        setBusy(true)
        // Si rien ne se passe (réseau lent, navigation bloquée), on réactive le bouton
        setTimeout(() => { busyRef.current = false; setBusy(false) }, 12_000)

        const qty = Math.max(1, Math.min(99, Math.floor(Number(quantityProp)) || 1))
        const lineId = `${product.id}`
        const existing = cart.find(item => item.id === lineId)

        // « Commander maintenant » = acheter CETTE quantité : on ne ré-ajoute pas l'article
        // s'il est déjà au panier (sinon chaque clic gonfle la quantité).
        const save = existing
            ? (existing.quantity !== qty ? updateQuantity(lineId, qty) : Promise.resolve())
            : addToCart({
                id: lineId,
                product_id: product.id,
                name: product.name,
                price: product.price,
                img: product.images?.[0] || product.img || '',
                seller_id: product.seller_id,
                shop_type: shop?.vendor_type || null,
                ...(selectedVariant?.color ? { selectedColor: selectedVariant.color } : {}),
                ...(selectedVariant?.size ? { selectedSize: selectedVariant.size } : {}),
            }, qty)
        // On n'attend pas indéfiniment la synchro serveur du panier avant d'ouvrir le paiement
        await Promise.race([save, new Promise(resolve => setTimeout(resolve, 8_000))])

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
        // Filet de sécurité : si la navigation interne n'a pas abouti, chargement classique de la page
        setTimeout(() => {
            if (!window.location.pathname.startsWith('/checkout')) window.location.assign('/checkout')
        }, 6_000)
    }

    return (
        <div>
            <button
                onClick={handleMainClick}
                disabled={busy}
                aria-busy={busy}
                className="w-full bg-orange-500 text-white py-4 rounded-[1.2rem] text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] disabled:opacity-80 disabled:cursor-wait"
            >
                {busy ? (
                    <><Loader2 size={16} className="animate-spin" /> Ouverture…</>
                ) : (
                    <>Commander maintenant <ArrowRight size={16} /></>
                )}
            </button>

            <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
        </div>
    )
}
