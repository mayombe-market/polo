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

/** Retourne les 10 chiffres ou `null` si invalide. */
export function parseStrict10Digits(input: string | undefined | null): string | null {
    if (input == null || input === '') return null
    const d = digitsOnly(input)
    return d.length === 10 ? d : null
}

/** Valide un numéro MTN Congo : 06XXXXXXX (local) ou 24206XXXXXXX (international). */
export function isValidMtnCongo(input: string): boolean {
    const d = digitsOnly(input)
    if (d.length === 9) return d.startsWith('06')
    if (d.length === 12) return d.startsWith('24206')
    return false
}

export function getMtnCongoError(input: string): string | null {
    const d = digitsOnly(input)
    if (!d) return null
    if (d.startsWith('243')) return 'Indicatif invalide — Congo (Brazzaville) utilise +242, pas +243'
    if (d.startsWith('05') || (d.length === 12 && d.startsWith('24205'))) return 'Numéro Airtel non accepté — utilisez un numéro MTN (commence par 06)'
    if (d.startsWith('0') && !d.startsWith('06')) return 'Préfixe invalide — les numéros MTN Congo commencent par 06'
    return null
}

/** Zod : téléphone saisi (espaces tolérés) → numéro MTN Congo valide. */
export const zodPhone10Digits = z
    .string()
    .superRefine((s, ctx) => {
        const hint = getMtnCongoError(s)
        if (hint) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: hint })
            return
        }
        if (!isValidMtnCongo(s)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Format attendu : 06 XXX XX XX (numéro MTN Congo)' })
        }
    })
    .transform((s) => digitsOnly(s))

/** Zod : ID de transaction Mobile Money / Airtel → exactement 10 chiffres. */
export const zodTransactionId10Digits = z
    .string()
    .transform((s) => digitsOnly(s))
    .refine((s) => /^\d{10}$/.test(s), { message: EXACTLY_10_DIGITS_MESSAGE })
