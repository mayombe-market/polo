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
    kind:
        | 'created' | 'vendor_confirmed' | 'vendor_disputed' | 'cod_accepted' | 'reminder' | 'confirmed'
        | 'rejected' | 'picked_up' | 'delivered' | 'client_confirmed' | 'rated'
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
    cod_accepted_at?: string | null
    client_confirmed_at?: string | null
    items?: Array<{ seller_id?: string }> | null
}

export type TimelineExtras = {
    /** Date de l'avis laissé par le client */
    ratedAt?: string | null
    /** Relances envoyées au vendeur par l'admin */
    reminders?: Array<{ at: string; shop?: string }>
}

const METHOD_LABEL: Record<string, string> = {
    mobile_money: 'MTN MoMo',
    airtel_money: 'Airtel Money',
    cash: 'paiement à la livraison',
}

export function buildOrderTimeline(order: TimelineOrder, shopNames: Record<string, string> = {}, extras: TimelineExtras = {}): TimelineEvent[] {
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

    if (order.cod_accepted_at) {
        const sellerId = order.items?.find(i => i.seller_id)?.seller_id
        const shop = (sellerId && shopNames[sellerId]) || 'Le vendeur'
        events.push({ at: order.cod_accepted_at, kind: 'cod_accepted', label: `${shop} a accepté la commande (paiement à la livraison)` })
    }
    for (const r of extras.reminders || []) {
        events.push({ at: r.at, kind: 'reminder', label: `Relance envoyée${r.shop ? ` à ${r.shop}` : ' au vendeur'}` })
    }
    if (order.confirmed_at) events.push({ at: order.confirmed_at, kind: 'confirmed', label: 'Commande confirmée' })
    if (order.status === 'rejected' && order.updated_at && !Object.values(vp).some(e => e.disputed)) {
        events.push({ at: order.updated_at, kind: 'rejected', label: 'Commande annulée' })
    }
    if (order.picked_up_at) events.push({ at: order.picked_up_at, kind: 'picked_up', label: 'Colis récupéré par le livreur' })
    if (order.delivered_at) events.push({ at: order.delivered_at, kind: 'delivered', label: 'Commande livrée' })
    if (order.client_confirmed_at) events.push({ at: order.client_confirmed_at, kind: 'client_confirmed', label: 'Le client a confirmé la réception' })
    if (extras.ratedAt) events.push({ at: extras.ratedAt, kind: 'rated', label: 'Le client a laissé son avis' })

    return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
}
