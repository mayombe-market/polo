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

/** Zod : téléphone saisi (espaces tolérés) → exactement 10 chiffres. */
export const zodPhone10Digits = z
    .string()
    .transform((s) => digitsOnly(s))
    .refine((s) => /^\d{10}$/.test(s), { message: EXACTLY_10_DIGITS_MESSAGE })

/** Zod : ID de transaction Mobile Money / Airtel → exactement 10 chiffres. */
export const zodTransactionId10Digits = z
    .string()
    .transform((s) => digitsOnly(s))
    .refine((s) => /^\d{10}$/.test(s), { message: EXACTLY_10_DIGITS_MESSAGE })
