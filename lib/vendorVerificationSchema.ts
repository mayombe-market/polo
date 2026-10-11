import '@/lib/zod-jitless'
import { z } from 'zod'

const nameField = z.string().trim().min(3, 'Minimum 3 caractères').max(120, 'Maximum 120 caractères')

export const VendorVerificationSubmitSchema = z.object({
    /** Particulier ou entreprise — détermine les champs obligatoires */
    vendorProfileType: z.enum(['particulier', 'entreprise']).default('particulier'),

    /** Numéro RCCM — obligatoire pour les entreprises, optionnel pour les particuliers */
    rccmNumber: z.string().trim().max(100, 'Maximum 100 caractères').optional().default(''),

    /** Type de pièce d'identité */
    idType: z.enum(['cni', 'passport', 'permis']).default('cni'),

    /** URL de la photo recto de la pièce d'identité */
    idPhotoUrl: z.string().url("URL photo pièce d'identité invalide").min(10),

    /**
     * URL de la photo verso (CNI recto/verso, permis recto/verso).
     * Optionnel pour passeport.
     */
    idPhotoBackUrl: z.string().url("URL photo verso invalide").min(10).optional(),

    /** Nom complet tel qu'il figure sur la pièce d'identité */
    managerName: nameField,

    /** NIU — obligatoire pour les entreprises, optionnel pour les particuliers */
    niuNumber: z.string().trim().max(50, 'Maximum 50 caractères').optional().default(''),

    /** Adresse de l'établissement / de résidence */
    address: z.string().trim().min(5, 'Minimum 5 caractères').max(300, 'Maximum 300 caractères'),

    /** Latitude GPS (optionnel) */
    addressLat: z.number().optional(),

    /** Longitude GPS (optionnel) */
    addressLng: z.number().optional(),
})
    .superRefine((data, ctx) => {
        if (data.vendorProfileType === 'entreprise') {
            if (!data.rccmNumber || data.rccmNumber.trim().length < 3) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['rccmNumber'],
                    message: 'Le RCCM est obligatoire pour une entreprise (minimum 3 caractères)',
                })
            }
            if (!data.niuNumber || data.niuNumber.trim().length < 3) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['niuNumber'],
                    message: 'Le NIU est obligatoire pour une entreprise (minimum 3 caractères)',
                })
            }
        }
    })

export type VendorVerificationSubmitInput = z.infer<typeof VendorVerificationSubmitSchema>
