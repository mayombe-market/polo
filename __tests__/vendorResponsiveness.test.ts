import { describe, it, expect } from 'vitest'
import {
    vendorAnsweredAt, isAwaitingVendor, summarizeResponsiveness, isFastResponder, formatDelay,
} from '@/lib/vendorResponsiveness'
import { computeVendorBadges } from '@/lib/vendorBadges'
import { buildOrderTimeline } from '@/lib/vendorPaymentDecision'
import { buildVendorReminderEmail } from '@/lib/orderDecisionEmails'

const T0 = '2026-10-21T10:00:00.000Z'
const plus = (min: number) => new Date(new Date(T0).getTime() + min * 60_000).toISOString()
const momo = (min: number | null, extra = {}) => ({
    created_at: T0, payment_method: 'mobile_money', status: min === null ? 'pending' : 'confirmed',
    items: [{ seller_id: 'v1' }],
    vendor_payments: { v1: min === null ? {} : { vendor_confirmed: true, vendor_confirmed_at: plus(min) } },
    ...extra,
})

describe('temps de réponse du vendeur', () => {
    it('Mobile Money : heure de validation du paiement', () => {
        expect(vendorAnsweredAt(momo(12), 'v1')).toBe(plus(12))
    })
    it('Mobile Money : un refus compte aussi comme une réponse', () => {
        const o = { ...momo(null), status: 'rejected', vendor_payments: { v1: { disputed: true, vendor_disputed_at: plus(40) } } }
        expect(vendorAnsweredAt(o, 'v1')).toBe(plus(40))
    })
    it('paiement à la livraison : heure d’acceptation', () => {
        expect(vendorAnsweredAt({ created_at: T0, payment_method: 'cash', cod_accepted_at: plus(5) }, 'v1')).toBe(plus(5))
    })
    it('commande en attente : le vendeur n’a pas répondu', () => {
        expect(isAwaitingVendor(momo(null), 'v1')).toBe(true)
        expect(isAwaitingVendor({ created_at: T0, payment_method: 'cash', status: 'pending', items: [{ seller_id: 'v1' }] }, 'v1')).toBe(true)
        expect(isAwaitingVendor(momo(10), 'v1')).toBe(false)
    })
    it('médiane sur les commandes du vendeur uniquement', () => {
        const orders = [momo(10), momo(30), momo(200), momo(null), { ...momo(5), items: [{ seller_id: 'autre' }] }]
        expect(summarizeResponsiveness(orders, 'v1')).toEqual({ answered: 3, medianMinutes: 30 })
    })
})

describe('badge « Répond rapidement »', () => {
    it('obtenu : au moins 3 réponses, médiane ≤ 1 h', () => {
        expect(isFastResponder({ answered: 3, medianMinutes: 45 })).toBe(true)
        const badges = computeVendorBadges({ responsiveness: { answered: 5, medianMinutes: 20 }, created_at: '2020-01-01', confirmed_sales_count: 10 })
        expect(badges.map(b => b.id)).toContain('fast')
    })
    it('refusé : trop peu de commandes ou trop lent', () => {
        expect(isFastResponder({ answered: 2, medianMinutes: 5 })).toBe(false)
        expect(isFastResponder({ answered: 10, medianMinutes: 61 })).toBe(false)
        expect(isFastResponder(null)).toBe(false)
    })
})

describe('formatDelay', () => {
    it('lisible', () => {
        expect(formatDelay(7)).toBe('7 min')
        expect(formatDelay(65)).toBe('1 h 05')
        expect(formatDelay(120)).toBe('2 h')
        expect(formatDelay(60 * 27)).toBe('1 j 3 h')
    })
})

describe('chronologie admin complète', () => {
    it('paiement à la livraison : commande → relance → acceptation → livraison → réception → avis', () => {
        const t = buildOrderTimeline({
            created_at: T0, status: 'delivered', payment_method: 'cash', items: [{ seller_id: 'v1' }],
            cod_accepted_at: plus(50), delivered_at: plus(600), client_confirmed_at: plus(700),
        }, { v1: 'Heaven shops' }, { ratedAt: plus(705), reminders: [{ at: plus(35), shop: 'Heaven shops' }] })
        expect(t.map(e => e.kind)).toEqual(['created', 'reminder', 'cod_accepted', 'delivered', 'client_confirmed', 'rated'])
        expect(t[1].label).toBe('Relance envoyée à Heaven shops')
        expect(t[2].label).toBe('Heaven shops a accepté la commande (paiement à la livraison)')
    })
})

describe('email de relance vendeur', () => {
    it('donne le retard, le montant et le code client', () => {
        const { subject, html } = buildVendorReminderEmail({
            vendorName: 'Moulounda', shopName: 'Heaven shops', orderNumber: 'MM-261021-0079', customerName: 'Nzaou Divin',
            productNames: 'Lime électrique', amount: 7500, method: 'mobile_money', delayLabel: '2 h 15', transactionId: '1234567890',
        })
        expect(subject).toBe('⏰ Commande MM-261021-0079 en attente depuis 2 h 15')
        expect(html).toContain('Bonjour Moulounda')
        expect(html).toContain('1234567890')
        expect(html).toContain('Paiement reçu')
    })
})
