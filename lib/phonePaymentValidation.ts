import '@/lib/zod-jitless'
import { z } from 'zod'

/** Message unique pour téléphone ou ID de transaction (paiement Mobile Money / Airtel). */
export const EXACTLY_10_DIGITS_MESSAGE =
    'Exactement 10 chiffres sont requis (chiffres uniquement, sans espaces une fois validé).'

export function digitsOnly(input: string): string {
    return input.replace(/\D/g, '')
}

export function isExactly10Digits(input: string): boolean {
    return /^\d{10}$/.test(digitsOnly(input))
}

/** Accepte les identifiants de transaction des deux opérateurs : 6 à 16 chiffres. */
export function isValidTransactionId(input: string): boolean {
    const d = digitsOnly(input)
    return d.length >= 6 && d.length <= 16
}

/** Retourne les 10 chiffres ou `null` si invalide. */
export function parseStrict10Digits(input: string | undefined | null): string | null {
    if (input == null || input === '') return null
    const d = digitsOnly(input)
    return d.length === 10 ? d : null
}

/** Valide un numéro Congo : MTN 06XXXXXXX ou Airtel 05XXXXXXX (local 9 chiffres, ou international +242). */
export function isValidCongolaisNumber(input: string): boolean {
    const d = digitsOnly(input)
    if (d.length === 9) return d.startsWith('06') || d.startsWith('05')
    if (d.length === 12) return d.startsWith('24206') || d.startsWith('24205')
    return false
}

/** @deprecated Utiliser isValidCongolaisNumber */
export function isValidMtnCongo(input: string): boolean {
    return isValidCongolaisNumber(input)
}

export function getCongolaisNumberError(input: string): string | null {
    const d = digitsOnly(input)
    if (!d) return null
    if (d.startsWith('243')) return 'Indicatif invalide — Congo (Brazzaville) utilise +242, pas +243'
    if (d.startsWith('0') && !d.startsWith('05') && !d.startsWith('06')) return 'Préfixe invalide — numéros Congo : MTN (06) ou Airtel (05)'
    return null
}

/** @deprecated Utiliser getCongolaisNumberError */
export function getMtnCongoError(input: string): string | null {
    return getCongolaisNumberError(input)
}

/** Zod : numéro de contact congolais (espaces tolérés) → MTN (06) ou Airtel (05). */
export const zodPhone10Digits = z
    .string()
    .superRefine((s, ctx) => {
        const hint = getCongolaisNumberError(s)
        if (hint) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: hint })
            return
        }
        if (!isValidCongolaisNumber(s)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Format attendu : 06 XXX XX XX (MTN) ou 05 XXX XX XX (Airtel)' })
        }
    })
    .transform((s) => digitsOnly(s))

/** Zod : ID de transaction Mobile Money / Airtel → exactement 10 chiffres (legacy, subscriptions). */
export const zodTransactionId10Digits = z
    .string()
    .transform((s) => digitsOnly(s))
    .refine((s) => /^\d{10}$/.test(s), { message: EXACTLY_10_DIGITS_MESSAGE })

/** Zod : ID de transaction Mobile Money / Airtel → 6 à 16 chiffres (tous opérateurs). */
export const TRANSACTION_ID_MESSAGE =
    'Identifiant de transaction invalide (entre 6 et 16 chiffres, tel qu\'indiqué dans votre SMS).'

export const zodTransactionId = z
    .string()
    .transform((s) => digitsOnly(s))
    .refine((s) => s.length >= 6 && s.length <= 16, { message: TRANSACTION_ID_MESSAGE })
