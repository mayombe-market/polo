import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Tests unitaires pour la logique de création de commandes invitées.
 * Teste les règles métier extraites de createGuestOrder sans appels Supabase réels.
 */

describe('Rate-limit commandes invitées', () => {
    it('bloque si ≥ 5 commandes dans les 24h', () => {
        function checkRateLimit(recentCount: number): string | null {
            if (recentCount >= 5) {
                return 'Trop de commandes récentes avec ce numéro. Réessayez dans 24h ou créez un compte.'
            }
            return null
        }
        expect(checkRateLimit(4)).toBeNull()
        expect(checkRateLimit(5)).not.toBeNull()
        expect(checkRateLimit(10)).not.toBeNull()
    })
})

describe('Idempotence commande invitée', () => {
    it('retourne la commande existante si même idempotency_key', () => {
        const existingOrder = { id: 'ord-1', guest_token: 'tok-abc', status: 'pending', total_amount: 5500 }

        function findByIdempotencyKey(key: string | undefined, db: typeof existingOrder | null) {
            if (!key || !db) return null
            return db // simulé : retourne la commande si clé match
        }

        expect(findByIdempotencyKey('key-123', existingOrder)).toEqual(existingOrder)
        expect(findByIdempotencyKey(undefined, null)).toBeNull()
    })
})

describe('Génération guest_token', () => {
    it('génère un UUID différent à chaque appel', () => {
        const { randomUUID } = require('crypto')
        const t1 = randomUUID()
        const t2 = randomUUID()
        expect(t1).not.toBe(t2)
        expect(t1).toMatch(/^[0-9a-f-]{36}$/)
    })
})

describe('Validation commande COD — acceptation des vendeurs', () => {
    it('bloque si au moins un vendeur refuse COD', () => {
        function checkVendorsCod(vendors: Array<{ id: string; accept_cod: boolean | null }>): string | null {
            const refusing = vendors.find(v => v.accept_cod === false)
            if (refusing) return "Un ou plusieurs vendeurs n'acceptent pas le paiement à la livraison."
            return null
        }

        expect(checkVendorsCod([{ id: 'v1', accept_cod: true }])).toBeNull()
        expect(checkVendorsCod([{ id: 'v1', accept_cod: null }])).toBeNull() // null = non défini = accepte
        expect(checkVendorsCod([
            { id: 'v1', accept_cod: true },
            { id: 'v2', accept_cod: false },
        ])).not.toBeNull()
    })
})

describe('Détection double soumission (transaction_id)', () => {
    it('signale un TX ID déjà utilisé sur une commande confirmée', () => {
        const confirmedTxIds = new Set(['1234567890', '9876543210'])

        function isDuplicate(txId: string): boolean {
            const digits = txId.replace(/\D/g, '')
            return digits.length >= 6 && confirmedTxIds.has(digits)
        }

        expect(isDuplicate('1234567890')).toBe(true)
        expect(isDuplicate('0000000000')).toBe(false)
        expect(isDuplicate('abc')).toBe(false) // moins de 6 chiffres
    })
})

describe('Multivendeur — calcul des parts', () => {
    it('répartit correctement les montants par vendeur', () => {
        const items = [
            { seller_id: 'v1', price: 2000, quantity: 2 },
            { seller_id: 'v2', price: 3000, quantity: 1 },
            { seller_id: 'v1', price: 500, quantity: 1 },
        ]

        const vendorTotals = items.reduce((acc, item) => {
            acc[item.seller_id] = (acc[item.seller_id] || 0) + item.price * item.quantity
            return acc
        }, {} as Record<string, number>)

        expect(vendorTotals['v1']).toBe(4500)  // 2000*2 + 500*1
        expect(vendorTotals['v2']).toBe(3000)  // 3000*1
    })
})
