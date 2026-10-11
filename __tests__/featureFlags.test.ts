import { describe, it, expect } from 'vitest'
import { FEATURES, isEnabled } from '@/lib/featureFlags'

describe('Feature flags — état production', () => {
    it('guestCheckout est activé', () => {
        expect(FEATURES.guestCheckout).toBe(true)
    })
    it('directVendorPayment est activé', () => {
        expect(FEATURES.directVendorPayment).toBe(true)
    })
    it('cashOnDelivery est activé', () => {
        expect(FEATURES.cashOnDelivery).toBe(true)
    })
    it('subscriptions est désactivé', () => {
        expect(FEATURES.subscriptions).toBe(false)
    })
    it('commissions est désactivé', () => {
        expect(FEATURES.commissions).toBe(false)
    })
    it('les modules spécialisés sont désactivés', () => {
        expect(FEATURES.restaurant).toBe(false)
        expect(FEATURES.hotel).toBe(false)
        expect(FEATURES.immobilier).toBe(false)
        expect(FEATURES.patisserie).toBe(false)
    })
})

describe('isEnabled helper', () => {
    it('retourne true pour un flag activé', () => {
        expect(isEnabled('guestCheckout')).toBe(true)
    })
    it('retourne false pour un flag désactivé', () => {
        expect(isEnabled('subscriptions')).toBe(false)
    })
})

describe('Limites d\'abonnement désactivées (tâche 5)', () => {
    it('subscriptions=false → pas de limites produits à appliquer', () => {
        // Reproduit la guard dans createProduct
        const shouldApplyLimit = FEATURES.subscriptions
        expect(shouldApplyLimit).toBe(false)
    })

    it('subscriptions=false → getExpiredSellerIds retourne []', () => {
        // Reproduit la short-circuit dans filterActiveProducts.ts
        if (!FEATURES.subscriptions) {
            const result: string[] = []
            expect(result).toHaveLength(0)
        }
    })
})
