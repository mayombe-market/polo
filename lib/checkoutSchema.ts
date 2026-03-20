import { z } from 'zod'

export const CheckoutSchema = z.object({
    full_name: z.string().min(3, "Nom complet requis"),
    phone: z.string().min(8, "Numéro de téléphone valide requis"),
    city: z.string().min(2, "Ville requise"),
    district: z.string().min(2, "Quartier requis"),
    landmark: z.string().optional(), // Le fameux "Point de repère"
    payment_method: z.enum(['cod', 'mobile_money']), // COD = Cash on Delivery
    // Pas de .default() : le total affiché doit rester « articles seuls » jusqu’au choix explicite du mode.
    delivery_mode: z.enum(['standard', 'express'], {
        message: 'Choisissez un mode de livraison',
    }),
})

export type CheckoutType = z.infer<typeof CheckoutSchema>

// ═══ Tarifs livraison ═══
export const DELIVERY_FEES = {
    standard: 1000,
    express: 2000,
} as const