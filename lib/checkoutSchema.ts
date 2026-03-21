import '@/lib/zod-jitless'
import { z } from 'zod'
import { zodPhone10Digits } from '@/lib/phonePaymentValidation'

export const CheckoutSchema = z.object({
    full_name: z.string().min(3, "Nom complet requis"),
    phone: zodPhone10Digits,
    city: z.string().min(2, "Ville requise"),
    district: z.string().min(2, "Quartier requis"),
    landmark: z.string().optional(), // Le fameux "Point de repère"
    payment_method: z.enum(['cod', 'mobile_money']), // COD = Cash on Delivery
    // Pas de .default() : le total affiché doit rester « articles seuls » jusqu’au choix explicite du mode.
    delivery_mode: z.enum(['standard', 'express', 'inter_urban'], {
        message: 'Choisissez un mode de livraison',
    }),
})

export type CheckoutType = z.infer<typeof CheckoutSchema>

// ═══ Tarifs livraison ═══
export const DELIVERY_FEES = {
    standard: 1000,
    express: 2000,
} as const

/** Forfait livraison inter-ville (acheteur et vendeur dans des villes différentes). */
export const DELIVERY_FEE_INTER_URBAN = 3500

export const INTER_URBAN_DELIVERY_TIMELINE =
    'Livraison prévue sous 24h à 96h (max 4 jours)'

/** Alerte affichée avant le choix du paiement (tunnel inter-ville). */
export const INTER_URBAN_PRE_PAYMENT_ALERT =
    'Attention : Vous vous apprêtez à acheter dans une ville différente. Les frais de livraison sont différents. Voulez-vous continuer ?'