import { z } from 'zod'

export const CheckoutSchema = z.object({
    full_name: z.string().min(3, "Nom complet requis"),
    phone: z.string().min(8, "Numéro de téléphone valide requis"),
    city: z.string().min(2, "Ville requise"),
    district: z.string().min(2, "Quartier requis"),
    landmark: z.string().optional(), // Le fameux "Point de repère"
    payment_method: z.enum(['cod', 'mobile_money']), // COD = Cash on Delivery
})

export type CheckoutType = z.infer<typeof CheckoutSchema>