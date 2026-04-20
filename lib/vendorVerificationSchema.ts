import '@/lib/zod-jitless'
import { z } from 'zod'

const phoneCongo242 = z
    .string()
    .trim()
    .regex(/^\d{9}$/, 'Le numéro doit contenir exactement 9 chiffres (sans +242)')

const nameField = z.string().trim().min(3, 'Minimum 3 caractères').max(120, 'Maximum 120 caractères')

export const VendorVerificationSubmitSchema = z.object({
    /** Type de pièce d'identité choisie */
    idType: z.enum(['cni', 'passport']).default('cni'),

    /** Photo de la boutique / lieu de vente */
    shopPhotoUrl: z.string().url('URL photo boutique invalide').min(10),

    /** Photo CNI — obligatoire si idType === 'cni' */
    cniPhotoUrl: z.string().url('URL photo CNI invalide').min(10).optional(),

    /** Photo passeport (page principale) — obligatoire si idType === 'passport' */
    passportPhotoUrl: z.string().url('URL photo passeport invalide').min(10).optional(),

    /** Nom complet tel qu'il figure sur la pièce d'identité (CNI ou passeport) */
    cniName: nameField,

    /** Nom sur le compte Mobile Money */
    momoName: nameField,

    momoNumber: phoneCongo242,
    momoOperator: z.enum(['MTN', 'Airtel']),

    /** NIU (Numéro d'Identification Unique) — optionnel */
    niuNumber: z.string().trim().max(50, 'Maximum 50 caractères').optional(),
}).superRefine((data, ctx) => {
    if (data.idType === 'cni' && !data.cniPhotoUrl) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'La photo de la CNI est obligatoire',
            path: ['cniPhotoUrl'],
        })
    }
    if (data.idType === 'passport' && !data.passportPhotoUrl) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'La photo du passeport est obligatoire',
            path: ['passportPhotoUrl'],
        })
    }
})

export type VendorVerificationSubmitInput = z.infer<typeof VendorVerificationSubmitSchema>
