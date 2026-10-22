import type { VendorPayments } from '@/lib/vendorPaymentDecision'

type ResponsivenessOrder = {
    created_at: string
    payment_method?: string | null
    status?: string | null
    order_type?: string | null
    cod_accepted_at?: string | null
    vendor_payments?: VendorPayments | null
    items?: Array<{ seller_id?: string }> | null
}

/** Seuil du badge « Répond rapidement ». */
export const FAST_RESPONSE_MAX_MINUTES = 60
export const FAST_RESPONSE_MIN_ORDERS = 3

/** Heure de la réponse du vendeur (validation/refus Mobile Money, acceptation paiement à la livraison). */
export function vendorAnsweredAt(order: ResponsivenessOrder, vendorId: string): string | null {
    const entry = order.vendor_payments?.[vendorId]
    if (entry?.vendor_confirmed_at) return entry.vendor_confirmed_at
    if (entry?.disputed && entry.vendor_disputed_at) return entry.vendor_disputed_at
    if (order.payment_method === 'cash' && order.cod_accepted_at) return order.cod_accepted_at
    return null
}

export function minutesBetween(from: string, to: string): number {
    return Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000))
}

/** La commande attend-elle encore une réponse de ce vendeur ? */
export function isAwaitingVendor(order: ResponsivenessOrder, vendorId: string): boolean {
    if (order.status !== 'pending' || order.order_type === 'subscription') return false
    const entry = order.vendor_payments?.[vendorId]
    if (entry) return !entry.vendor_confirmed && !entry.disputed
    return order.payment_method === 'cash'
}

export type ResponsivenessSummary = { answered: number; medianMinutes: number | null }

export function summarizeResponsiveness(orders: ResponsivenessOrder[], vendorId: string): ResponsivenessSummary {
    const delays = orders
        .filter(o => o.order_type !== 'subscription' && (o.items || []).some(i => i.seller_id === vendorId))
        .map(o => {
            const at = vendorAnsweredAt(o, vendorId)
            return at ? minutesBetween(o.created_at, at) : null
        })
        .filter((m): m is number => m !== null)
        .sort((a, b) => a - b)
    if (delays.length === 0) return { answered: 0, medianMinutes: null }
    const mid = Math.floor(delays.length / 2)
    const median = delays.length % 2 ? delays[mid] : Math.round((delays[mid - 1] + delays[mid]) / 2)
    return { answered: delays.length, medianMinutes: median }
}

export function isFastResponder(s: ResponsivenessSummary | null | undefined): boolean {
    return !!s && s.answered >= FAST_RESPONSE_MIN_ORDERS && s.medianMinutes !== null && s.medianMinutes <= FAST_RESPONSE_MAX_MINUTES
}

/** 7 min · 1 h 05 · 2 j 3 h */
export function formatDelay(minutes: number): string {
    if (minutes < 60) return `${minutes} min`
    const h = Math.floor(minutes / 60)
    if (h < 24) {
        const m = minutes % 60
        return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
    }
    const d = Math.floor(h / 24)
    const rh = h % 24
    return rh ? `${d} j ${rh} h` : `${d} j`
}
