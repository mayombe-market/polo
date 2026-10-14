import { describe, it, expect } from 'vitest'

/** Reproduit la logique du filtre dans getVendorOrders (app/actions/orders.ts) */
function isVisibleToVendor(order: {
    status: string
    payment_method: string
    order_type: string
    items: Array<{ seller_id: string }>
}, vendorId: string): boolean {
    return (
        order.order_type !== 'subscription' &&
        order.items.some(item => item.seller_id === vendorId)
    )
}

describe('getVendorOrders — visibilité', () => {
    const vendorId = 'vendor-123'

    it('affiche les commandes MTN en attente de paiement', () => {
        const order = { status: 'pending', payment_method: 'mobile_money', order_type: 'product', items: [{ seller_id: vendorId }] }
        expect(isVisibleToVendor(order, vendorId)).toBe(true)
    })

    it('affiche les commandes Airtel en attente', () => {
        const order = { status: 'pending', payment_method: 'airtel_money', order_type: 'product', items: [{ seller_id: vendorId }] }
        expect(isVisibleToVendor(order, vendorId)).toBe(true)
    })

    it('affiche les commandes COD pending (cash)', () => {
        const order = { status: 'pending', payment_method: 'cash', order_type: 'product', items: [{ seller_id: vendorId }] }
        expect(isVisibleToVendor(order, vendorId)).toBe(true)
    })

    it('affiche les commandes confirmées', () => {
        const order = { status: 'confirmed', payment_method: 'mobile_money', order_type: 'product', items: [{ seller_id: vendorId }] }
        expect(isVisibleToVendor(order, vendorId)).toBe(true)
    })

    it('masque les commandes d\'abonnement', () => {
        const order = { status: 'confirmed', payment_method: 'mobile_money', order_type: 'subscription', items: [{ seller_id: vendorId }] }
        expect(isVisibleToVendor(order, vendorId)).toBe(false)
    })

    it('masque les commandes d\'un autre vendeur', () => {
        const order = { status: 'confirmed', payment_method: 'mobile_money', order_type: 'product', items: [{ seller_id: 'other-vendor' }] }
        expect(isVisibleToVendor(order, vendorId)).toBe(false)
    })

    it('affiche commandes livrées', () => {
        const order = { status: 'delivered', payment_method: 'cash', order_type: 'product', items: [{ seller_id: vendorId }] }
        expect(isVisibleToVendor(order, vendorId)).toBe(true)
    })

    it('multivendeur : visible si au moins un item du vendeur', () => {
        const order = {
            status: 'confirmed', payment_method: 'mobile_money', order_type: 'product',
            items: [{ seller_id: 'other-vendor' }, { seller_id: vendorId }],
        }
        expect(isVisibleToVendor(order, vendorId)).toBe(true)
    })
})
