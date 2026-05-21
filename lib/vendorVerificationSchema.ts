import '@/lib/zod-jitless'
import { z } from 'zod'

const nameField = z.string().trim().min(3, 'Minimum 3 caractères').max(120, 'Maximum 120 caractères')

export const VendorVerificationSubmitSchema = z.object({
    /** Numéro RCCM (Registre du Commerce et du Crédit Mobilier) */
    rccmNumber: z.string().trim().min(3, 'Minimum 3 caractères').max(100, 'Maximum 100 caractères'),

    /** Type de pièce d'identité du gérant */
    idType: z.enum(['cni', 'passport', 'permis']).default('cni'),

    /** Photo de la pièce d'identité (CNI, passeport ou permis) */
    idPhotoUrl: z.string().url("URL photo pièce d'identité invalide").min(10),

    /** Nom complet du gérant (tel qu'il figure sur la pièce d'identité) */
    managerName: nameField,

    /** NIU (Numéro d'Identification Unique) — obligatoire */
    niuNumber: z.string().trim().min(3, 'Minimum 3 caractères').max(50, 'Maximum 50 caractères'),

    /** Adresse de l'établissement */
    address: z.string().trim().min(5, 'Minimum 5 caractères').max(300, 'Maximum 300 caractères'),

    /** Latitude GPS (optionnel, si position capturée) */
    addressLat: z.number().optional(),

    /** Longitude GPS (optionnel, si position capturée) */
    addressLng: z.number().optional(),
})

export type VendorVerificationSubmitInput = z.infer<typeof VendorVerificationSubmitSchema>
