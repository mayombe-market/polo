import { describe, it, expect } from 'vitest'
import {
    buildBuyerDecisionEmail,
    buildVendorNewOrderEmail,
    buildVendorCancelledEmail,
} from '@/lib/orderDecisionEmails'

const vendor = { shopName: 'Boutique Élégance', whatsapp: '066262864', phone: null, pickupAddress: 'Marché Total, Bacongo' }

describe('email acheteur — décision du vendeur', () => {
    it('confirmation : nom de la boutique, WhatsApp, n° de suivi', () => {
        const { subject, html } = buildBuyerDecisionEmail({
            decision: 'confirmed',
            customerName: 'Christelle',
            orderNumber: 'MM-261021-0042',
            vendor,
            productNames: 'Robe wax ×2',
            amount: 25000,
            transactionId: '1234567890',
            trackingNumber: 'MM-TRK-ABC123',
            deliveryMode: 'express',
        })
        expect(subject).toBe('Boutique Élégance a confirmé votre commande MM-261021-0042')
        expect(html).toContain('Boutique Élégance')
        expect(html).toContain('https://wa.me/242066262864')
        expect(html).toContain('+242 06 626 28 64')
        expect(html).toContain('MM-TRK-ABC123')
        expect(html).toContain('25 000 FCFA'.replace(' ', ' '))
        expect(html).toContain('Livraison express')
    })

    it('refus : explique quoi faire et donne le contact du vendeur', () => {
        const { subject, html } = buildBuyerDecisionEmail({
            decision: 'refused',
            customerName: 'Patrick',
            orderNumber: 'MM-261021-0043',
            vendor,
            productNames: 'Chaussures',
            amount: 15000,
            transactionId: '9876543210',
        })
        expect(subject).toContain('annulée')
        expect(html).toContain('ne pas avoir reçu votre paiement')
        expect(html).toContain('9876543210')
        expect(html).toContain('wa.me/242066262864')
    })

    it('protège contre l\'injection HTML', () => {
        const { html } = buildBuyerDecisionEmail({
            decision: 'confirmed',
            customerName: '<script>alert(1)</script>',
            orderNumber: 'MM-1',
            vendor: { shopName: '<b>X</b>' },
            productNames: '<img src=x>',
            amount: 1,
        })
        expect(html).not.toContain('<script>')
        expect(html).not.toContain('<img src=x>')
        expect(html).not.toContain('<b>X</b>')
    })

    it('sans WhatsApp : pas de bouton cassé', () => {
        const { html } = buildBuyerDecisionEmail({
            decision: 'partial',
            customerName: 'A',
            orderNumber: 'MM-1',
            vendor: { shopName: 'Shop' },
            productNames: 'P',
            amount: 1000,
        })
        expect(html).not.toContain('wa.me')
    })
})

describe('email vendeur — nouvelle commande', () => {
    it('MTN : demande de vérifier le montant et le code', () => {
        const { subject, html } = buildVendorNewOrderEmail({
            shopName: 'Chez Mama',
            orderNumber: 'MM-261021-0044',
            customerName: 'Sandrine',
            city: 'Brazzaville',
            district: 'Moungali',
            productNames: 'Gâteau',
            amount: 12000,
            method: 'mobile_money',
            transactionId: '1112223334',
            receivingNumber: '06 626 28 64',
            deliveryMode: 'standard',
        })
        expect(subject).toContain('vérifiez le paiement')
        expect(html).toContain('Sandrine')
        expect(html).toContain('1112223334')
        expect(html).toContain('Moungali, Brazzaville')
        expect(html).toContain('Paiement reçu')
        expect(html).toContain('/vendor/dashboard?tab=orders')
    })

    it('paiement à la livraison : pas de demande de vérification', () => {
        const { html } = buildVendorNewOrderEmail({
            shopName: 'Chez Mama', orderNumber: 'MM-1', customerName: 'A', productNames: 'P', amount: 1000, method: 'cash',
        })
        expect(html).not.toContain('Action requise')
    })
})

describe('email vendeur — commande multi-vendeurs annulée', () => {
    it('demande le remboursement si le vendeur avait déjà encaissé', () => {
        const { html } = buildVendorCancelledEmail({
            shopName: 'A', orderNumber: 'MM-1', customerName: 'C', refusingShop: 'B', alreadyConfirmed: true, amount: 5000,
        })
        expect(html).toContain('rembourser')
    })
})
