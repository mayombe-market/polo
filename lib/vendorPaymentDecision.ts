export type VendorPaymentEntry = {
    amount?: number
    method?: string
    vendor_number?: string | null
    holder_name?: string | null
    transaction_id?: string
    sender_phone?: string
    vendor_confirmed?: boolean
    vendor_confirmed_at?: string | null
    disputed?: boolean
    vendor_disputed_at?: string | null
}

export type VendorPayments = Record<string, VendorPaymentEntry>

export type OrderOutcome = 'confirm' | 'reject' | 'wait'

/** Un refus suffit à annuler ; la commande n'est confirmée que quand tous les vendeurs ont validé. */
export function decideOrderOutcome(vendorPayments: VendorPayments | null | undefined): OrderOutcome {
    const entries = Object.values(vendorPayments || {})
    if (entries.length === 0) return 'wait'
    if (entries.some(e => e.disputed)) return 'reject'
    if (entries.every(e => e.vendor_confirmed)) return 'confirm'
    return 'wait'
}

export function markVendorDisputed(vendorPayments: VendorPayments, vendorId: string, at: string): VendorPayments {
    return {
        ...vendorPayments,
        [vendorId]: {
            ...vendorPayments[vendorId],
            vendor_confirmed: false,
            vendor_confirmed_at: null,
            disputed: true,
            vendor_disputed_at: at,
        },
    }
}

export type TimelineEvent = {
    at: string
    kind: 'created' | 'vendor_confirmed' | 'vendor_disputed' | 'confirmed' | 'rejected' | 'picked_up' | 'delivered'
    label: string
}

type TimelineOrder = {
    created_at: string
    status: string
    payment_method?: string | null
    transaction_id?: string | null
    vendor_payments?: VendorPayments | null
    confirmed_at?: string | null
    picked_up_at?: string | null
    delivered_at?: string | null
    updated_at?: string | null
}

const METHOD_LABEL: Record<string, string> = {
    mobile_money: 'MTN MoMo',
    airtel_money: 'Airtel Money',
    cash: 'paiement à la livraison',
}

export function buildOrderTimeline(order: TimelineOrder, shopNames: Record<string, string> = {}): TimelineEvent[] {
    const events: TimelineEvent[] = []
    const vp = order.vendor_payments || {}
    const declaredTx = order.transaction_id || Object.values(vp).find(e => e.transaction_id)?.transaction_id
    const method = METHOD_LABEL[order.payment_method || ''] || order.payment_method || ''

    events.push({
        at: order.created_at,
        kind: 'created',
        label: declaredTx
            ? `Commande passée — code ${method} envoyé : ${declaredTx}`
            : `Commande passée${method ? ` — ${method}` : ''}`,
    })

    for (const [sid, entry] of Object.entries(vp)) {
        const shop = shopNames[sid] || 'Vendeur'
        if (entry.vendor_confirmed && entry.vendor_confirmed_at) {
            events.push({ at: entry.vendor_confirmed_at, kind: 'vendor_confirmed', label: `${shop} a validé le paiement` })
        }
        if (entry.disputed) {
            events.push({
                at: entry.vendor_disputed_at || order.updated_at || order.created_at,
                kind: 'vendor_disputed',
                label: `${shop} a refusé : paiement non reçu`,
            })
        }
    }

    if (order.confirmed_at) events.push({ at: order.confirmed_at, kind: 'confirmed', label: 'Commande confirmée' })
    if (order.status === 'rejected' && order.updated_at && !Object.values(vp).some(e => e.disputed)) {
        events.push({ at: order.updated_at, kind: 'rejected', label: 'Commande annulée' })
    }
    if (order.picked_up_at) events.push({ at: order.picked_up_at, kind: 'picked_up', label: 'Colis récupéré par le livreur' })
    if (order.delivered_at) events.push({ at: order.delivered_at, kind: 'delivered', label: 'Commande livrée' })

    return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
}
