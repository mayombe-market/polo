import { describe, it, expect } from 'vitest'
import {
    decideOrderOutcome,
    markVendorDisputed,
    buildOrderTimeline,
} from '@/lib/vendorPaymentDecision'

describe('decideOrderOutcome', () => {
    it('attend tant que le vendeur n\'a pas répondu', () => {
        expect(decideOrderOutcome({ v1: { transaction_id: '1234567890' } })).toBe('wait')
    })

    it('confirme quand le vendeur unique a reçu le paiement', () => {
        expect(decideOrderOutcome({ v1: { vendor_confirmed: true } })).toBe('confirm')
    })

    it('annule quand le vendeur refuse', () => {
        expect(decideOrderOutcome({ v1: { disputed: true } })).toBe('reject')
    })

    it('multi-vendeurs : attend que tous valident', () => {
        expect(decideOrderOutcome({ v1: { vendor_confirmed: true }, v2: {} })).toBe('wait')
        expect(decideOrderOutcome({ v1: { vendor_confirmed: true }, v2: { vendor_confirmed: true } })).toBe('confirm')
    })

    it('multi-vendeurs : un seul refus annule tout', () => {
        expect(decideOrderOutcome({ v1: { vendor_confirmed: true }, v2: { disputed: true } })).toBe('reject')
    })

    it('sans paiement déclaré : attend', () => {
        expect(decideOrderOutcome({})).toBe('wait')
        expect(decideOrderOutcome(null)).toBe('wait')
    })
})

describe('markVendorDisputed', () => {
    it('horodate le refus sans toucher aux autres vendeurs', () => {
        const at = '2026-10-21T10:00:00.000Z'
        const vp = markVendorDisputed(
            { v1: { amount: 5000, vendor_confirmed: true, vendor_confirmed_at: 'x' }, v2: { vendor_confirmed: true, vendor_confirmed_at: 'y' } },
            'v1',
            at
        )
        expect(vp.v1).toMatchObject({ amount: 5000, disputed: true, vendor_confirmed: false, vendor_confirmed_at: null, vendor_disputed_at: at })
        expect(vp.v2).toEqual({ vendor_confirmed: true, vendor_confirmed_at: 'y' })
    })
})

describe('buildOrderTimeline', () => {
    const base = {
        created_at: '2026-10-21T14:32:00.000Z',
        status: 'pending',
        payment_method: 'mobile_money',
        transaction_id: '1234567890',
    }

    it('affiche la commande et le code envoyé', () => {
        const t = buildOrderTimeline(base)
        expect(t).toHaveLength(1)
        expect(t[0].kind).toBe('created')
        expect(t[0].label).toContain('1234567890')
        expect(t[0].label).toContain('MTN MoMo')
    })

    it('ordonne : commande → validation vendeur → confirmation → livraison', () => {
        const t = buildOrderTimeline({
            ...base,
            status: 'delivered',
            vendor_payments: { v1: { vendor_confirmed: true, vendor_confirmed_at: '2026-10-21T14:50:00.000Z' } },
            confirmed_at: '2026-10-21T14:50:01.000Z',
            delivered_at: '2026-10-22T09:00:00.000Z',
        }, { v1: 'Boutique Élégance' })
        expect(t.map(e => e.kind)).toEqual(['created', 'vendor_confirmed', 'confirmed', 'delivered'])
        expect(t[1].label).toBe('Boutique Élégance a validé le paiement')
    })

    it('affiche le refus du vendeur avec son heure', () => {
        const t = buildOrderTimeline({
            ...base,
            status: 'rejected',
            vendor_payments: { v1: { disputed: true, vendor_disputed_at: '2026-10-21T15:05:00.000Z' } },
        }, { v1: 'Chez Mama' })
        const refusal = t.find(e => e.kind === 'vendor_disputed')!
        expect(refusal.label).toBe('Chez Mama a refusé : paiement non reçu')
        expect(refusal.at).toBe('2026-10-21T15:05:00.000Z')
        expect(t.some(e => e.kind === 'rejected')).toBe(false)
    })

    it('annulation sans refus vendeur (admin) : utilise updated_at', () => {
        const t = buildOrderTimeline({ ...base, status: 'rejected', updated_at: '2026-10-21T16:00:00.000Z' })
        expect(t.at(-1)).toMatchObject({ kind: 'rejected', at: '2026-10-21T16:00:00.000Z' })
    })
})
