import '@/lib/zod-jitless'
import { z } from 'zod'
import { zodPhone10Digits } from '@/lib/phonePaymentValidation'

export const CheckoutSchema = z.object({
    full_name: z.string().min(3, "Nom complet requis"),
    phone: zodPhone10Digits,
    city: z.string().min(2, "Ville requise"),
    district: z.string().min(2, "Quartier requis"),
    landmark: z.string().optional(),
    payment_method: z.enum(["cod", "mobile_money", "airtel_money"]),
    // pickup = retrait en boutique (frais = 0)
    // vendor_delivery = livraison par le vendeur (frais fixes par le vendeur dans son profil)
    // standard/express/inter_urban = livraison Mayombe Market (conserve, non active par defaut)
    // reserve_pickup = réservation avec paiement au retrait (COD en boutique)
    delivery_mode: z.enum(["standard", "express", "inter_urban", "pickup", "vendor_delivery", "reserve_pickup"], {
        message: "Choisissez un mode de livraison",
    }),
})

export type CheckoutType = z.infer<typeof CheckoutSchema>

// Tarifs livraison Mayombe Market
export const DELIVERY_FEES = {
    standard: 1000,
    express: 2000,
} as const

/** Forfait livraison inter-ville (acheteur et vendeur dans des villes differentes). */
export const DELIVERY_FEE_INTER_URBAN = 3500

export const INTER_URBAN_DELIVERY_TIMELINE =
    'Livraison prevue sous 24h a 96h (max 4 jours)'

/** Alerte affichee avant le choix du paiement (tunnel inter-ville). */
export const INTER_URBAN_PRE_PAYMENT_ALERT =
    'Attention : Vous vous appretez a acheter dans une ville differente. Les frais de livraison sont differents. Voulez-vous continuer ?'
