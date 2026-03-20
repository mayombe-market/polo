import { z } from 'zod'

const phoneCongo242 = z
    .string()
    .trim()
    .regex(/^\d{9}$/, 'Le numéro doit contenir exactement 9 chiffres (sans +242)')

const nameField = z.string().trim().min(3, 'Minimum 3 caractères').max(120, 'Maximum 120 caractères')

export const VendorVerificationSubmitSchema = z.object({
    shopPhotoUrl: z.string().url('URL photo boutique invalide').min(10),
    cniPhotoUrl: z.string().url('URL photo CNI invalide').min(10),
    cniName: nameField,
    momoName: nameField,
    momoNumber: phoneCongo242,
    momoOperator: z.enum(['MTN', 'Airtel']),
})

export type VendorVerificationSubmitInput = z.infer<typeof VendorVerificationSubmitSchema>
