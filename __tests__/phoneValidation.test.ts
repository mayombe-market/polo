import { describe, it, expect } from 'vitest'
import {
    digitsOnly,
    isValidCongolaisNumber,
    isValidTransactionId,
    parseStrict10Digits,
    getCongolaisNumberError,
} from '@/lib/phonePaymentValidation'

describe('digitsOnly', () => {
    it('supprime espaces et tirets', () => {
        expect(digitsOnly('06 495 62 79')).toBe('064956279')
    })
    it('retourne vide si aucun chiffre', () => {
        expect(digitsOnly('abc-xyz')).toBe('')
    })
    it('retourne inchangé si déjà que des chiffres', () => {
        expect(digitsOnly('1234567890')).toBe('1234567890')
    })
})

describe('isValidCongolaisNumber', () => {
    it('accepte MTN local 9 chiffres (06XXXXXXX)', () => {
        expect(isValidCongolaisNumber('064956279')).toBe(true)
    })
    it('accepte Airtel local 9 chiffres (05XXXXXXX)', () => {
        expect(isValidCongolaisNumber('051234567')).toBe(true)
    })
    it('accepte international +242 MTN', () => {
        expect(isValidCongolaisNumber('242064956279')).toBe(true)
    })
    it('refuse préfixe inconnu', () => {
        expect(isValidCongolaisNumber('071234567')).toBe(false)
    })
    it('refuse longueur incorrecte', () => {
        expect(isValidCongolaisNumber('0612345')).toBe(false)
        expect(isValidCongolaisNumber('06123456789')).toBe(false)
    })
    it('refuse chaîne vide', () => {
        expect(isValidCongolaisNumber('')).toBe(false)
    })
})

describe('isValidTransactionId', () => {
    it('accepte exactement 6 chiffres', () => {
        expect(isValidTransactionId('123456')).toBe(true)
    })
    it('accepte 10 chiffres', () => {
        expect(isValidTransactionId('1234567890')).toBe(true)
    })
    it('accepte 16 chiffres', () => {
        expect(isValidTransactionId('1234567890123456')).toBe(true)
    })
    it('refuse moins de 6 chiffres', () => {
        expect(isValidTransactionId('12345')).toBe(false)
    })
    it('refuse plus de 16 chiffres', () => {
        expect(isValidTransactionId('12345678901234567')).toBe(false)
    })
    it('compte seulement les chiffres', () => {
        expect(isValidTransactionId('123 456')).toBe(true) // 6 chiffres avec espace
    })
})

describe('parseStrict10Digits', () => {
    it('retourne null pour null/undefined/vide', () => {
        expect(parseStrict10Digits(null)).toBeNull()
        expect(parseStrict10Digits(undefined)).toBeNull()
        expect(parseStrict10Digits('')).toBeNull()
    })
    it('retourne null si pas exactement 10 chiffres', () => {
        expect(parseStrict10Digits('12345')).toBeNull()
        expect(parseStrict10Digits('12345678901')).toBeNull()
    })
    it('retourne les 10 chiffres pour une entrée valide', () => {
        expect(parseStrict10Digits('12 34 56 78 90')).toBe('1234567890')
    })
})

describe('getCongolaisNumberError', () => {
    it('retourne null pour un numéro valide', () => {
        expect(getCongolaisNumberError('064956279')).toBeNull()
    })
    it('signale +243 (RDC, pas Congo-B)', () => {
        const err = getCongolaisNumberError('+243812345678')
        expect(err).not.toBeNull()
        expect(err).toContain('243')
    })
    it('signale un préfixe invalide (07, 08...)', () => {
        const err = getCongolaisNumberError('071234567')
        expect(err).not.toBeNull()
        expect(err).toContain('réfixe')
    })
})
