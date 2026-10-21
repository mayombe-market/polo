import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Base simulée en mémoire : reproduit les appels Supabase utilisés par le flux ──
type Row = Record<string, any>
const db: { orders: Row[]; profiles: Row[]; stockRestored: string[]; salesIncremented: string[] } = {
    orders: [], profiles: [], stockRestored: [], salesIncremented: [],
}

function query(table: 'orders' | 'profiles') {
    const filters: Array<(r: Row) => boolean> = []
    let patch: Row | null = null
    const api: any = {
        select: () => api,
        update: (p: Row) => { patch = p; return api },
        eq: (col: string, val: unknown) => { filters.push(r => r[col] === val); return api },
        in: (col: string, vals: unknown[]) => { filters.push(r => vals.includes(r[col])); return api },
        single: async () => {
            const row = db[table].find(r => filters.every(f => f(r)))
            return { data: row ? structuredClone(row) : null, error: row ? null : { message: 'not found' } }
        },
        then: (resolve: (v: unknown) => void) => {
            const rows = db[table].filter(r => filters.every(f => f(r)))
            if (patch) for (const r of rows) Object.assign(r, structuredClone(patch))
            resolve({ data: rows.map(r => ({ id: r.id, ...r })), error: null })
        },
    }
    return api
}

const fakeClient = {
    from: (t: 'orders' | 'profiles') => query(t),
    rpc: async (name: string, args: Row) => {
        if (name === 'confirm_vendor_payment') {
            const o = db.orders.find(r => r.id === args.p_order_id && r.status === 'pending' && r.vendor_payments?.[args.p_vendor_id])
            if (!o) return { data: false, error: null }
            o.vendor_payments[args.p_vendor_id] = {
                ...o.vendor_payments[args.p_vendor_id],
                vendor_confirmed: args.p_confirmed,
                vendor_confirmed_at: args.p_confirmed ? '2026-10-21T14:50:00.000Z' : null,
                disputed: !args.p_confirmed,
            }
            return { data: true, error: null }
        }
        if (name === 'restore_order_stock') { db.stockRestored.push(args.p_order_id); return { data: null, error: null } }
        if (name === 'increment_confirmed_sales') { db.salesIncremented.push(args.p_product_id); return { data: null, error: null } }
        return { data: null, error: { message: `rpc inconnue ${name}` } }
    },
}

vi.mock('server-only', () => ({}))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => fakeClient }))

const sent = {
    notifications: [] as Array<{ userId: string; type: string; title: string; body: string }>,
    pushes: [] as Array<{ ids: string[]; title: string }>,
    buyerEmails: [] as Array<{ to: string; decision: string; shop: string; tracking?: string | null }>,
    vendorNewOrderEmails: [] as Array<{ to: string; tx?: string | null }>,
    vendorCancelledEmails: [] as Array<{ to: string; alreadyConfirmed: boolean }>,
}
vi.mock('@/app/actions/notifications', () => ({
    createNotification: async (userId: string, type: string, title: string, body: string) => { sent.notifications.push({ userId, type, title, body }) },
}))
vi.mock('@/lib/pushServer', () => ({
    sendPushToUsers: async (ids: string[], title: string) => { sent.pushes.push({ ids, title }) },
}))
vi.mock('@/app/actions/emails', () => ({
    sendBuyerVendorDecisionEmail: async (to: string, d: any) => { sent.buyerEmails.push({ to, decision: d.decision, shop: d.vendor.shopName, tracking: d.trackingNumber }) },
    sendVendorNewOrderEmail: async (to: string, d: any) => { sent.vendorNewOrderEmails.push({ to, tx: d.transactionId }) },
    sendVendorOrderCancelledEmail: async (to: string, d: any) => { sent.vendorCancelledEmails.push({ to, alreadyConfirmed: d.alreadyConfirmed }) },
}))

const { applyVendorPaymentDecision, notifyVendorsNewOrder, syncBuyerTransactionToVendors } = await import('@/lib/orderNotifyServer')

// Les notifications sont planifiées après la réponse : on les exécute pour vérifier leur contenu.
let scheduled: Array<() => Promise<void>> = []
const schedule = (t: () => Promise<void>) => { scheduled.push(t) }
const flush = async () => { for (const t of scheduled.splice(0)) await t() }

function order(over: Row = {}): Row {
    return {
        id: 'o1', order_number: 42, created_at: '2026-10-21T14:32:00.000Z', status: 'pending',
        user_id: 'buyer1', customer_name: 'Christelle', customer_email: 'christelle@example.com',
        city: 'Brazzaville', district: 'Moungali', delivery_mode: 'express', payment_method: 'mobile_money',
        transaction_id: '1234567890', total_amount: 27000,
        items: [{ id: 'p1', name: 'Robe wax', quantity: 1, price: 25000, seller_id: 'v1' }],
        vendor_payments: { v1: { amount: 25000, method: 'mobile_money', vendor_number: '06 626 28 64', transaction_id: '1234567890', vendor_confirmed: false, vendor_confirmed_at: null, disputed: false } },
        ...over,
    }
}

beforeEach(() => {
    db.orders = [order()]
    db.profiles = [
        { id: 'v1', shop_name: 'Boutique Élégance', email: 'v1@example.com', whatsapp_number: '066262864', phone: null, vendor_pickup_address: null },
        { id: 'v2', shop_name: 'Chez Mama', email: 'v2@example.com', whatsapp_number: '055000000', phone: null, vendor_pickup_address: null },
    ]
    db.stockRestored = []; db.salesIncremented = []
    for (const k of Object.keys(sent) as Array<keyof typeof sent>) sent[k].length = 0
    scheduled = []
})

describe('Nouvelle commande → vendeur prévenu', () => {
    it('in-app + push + email au vendeur, avec le code du client', async () => {
        await notifyVendorsNewOrder('o1')
        expect(sent.notifications).toEqual([expect.objectContaining({ userId: 'v1', type: 'new_order' })])
        expect(sent.notifications[0].body).toContain('1234567890')
        expect(sent.pushes).toEqual([expect.objectContaining({ ids: ['v1'] })])
        expect(sent.vendorNewOrderEmails).toEqual([{ to: 'v1@example.com', tx: '1234567890' }])
    })

    it('commande invitée (sans compte) : le vendeur est aussi prévenu', async () => {
        db.orders = [order({ user_id: null, customer_email: null })]
        await notifyVendorsNewOrder('o1')
        expect(sent.notifications.map(n => n.userId)).toEqual(['v1'])
        expect(sent.vendorNewOrderEmails).toHaveLength(1)
    })
})

describe('Vendeur : « Paiement reçu »', () => {
    it('confirme la commande, génère le suivi, prévient client et vendeur', async () => {
        const res = await applyVendorPaymentDecision('o1', 'v1', true, schedule)
        expect(res).toMatchObject({ success: true, outcome: 'confirmed' })
        const o = db.orders[0]
        expect(o.status).toBe('confirmed')
        expect(o.tracking_number).toBeTruthy()
        expect(o.confirmed_at).toBeTruthy()
        expect(db.salesIncremented).toEqual(['p1'])

        await flush()
        expect(sent.buyerEmails).toEqual([{ to: 'christelle@example.com', decision: 'confirmed', shop: 'Boutique Élégance', tracking: o.tracking_number }])
        const buyerNotif = sent.notifications.find(n => n.userId === 'buyer1')!
        expect(buyerNotif.title).toBe('Boutique Élégance a confirmé votre commande ✓')
        expect(sent.notifications.some(n => n.userId === 'v1' && n.type === 'order_confirmed')).toBe(true)
        expect(sent.pushes.some(p => p.ids.includes('v1'))).toBe(true)
    })

    it('client invité : pas d\'email (pas de compte), commande quand même confirmée', async () => {
        db.orders = [order({ user_id: null, customer_email: null })]
        const res = await applyVendorPaymentDecision('o1', 'v1', true, schedule)
        expect(res).toMatchObject({ outcome: 'confirmed' })
        await flush()
        expect(sent.buyerEmails).toHaveLength(0)
        expect(sent.notifications.some(n => n.userId === 'v1')).toBe(true)
    })

    it('double clic : la seconde réponse est refusée, rien n\'est envoyé deux fois', async () => {
        await applyVendorPaymentDecision('o1', 'v1', true, schedule)
        const again = await applyVendorPaymentDecision('o1', 'v1', true, schedule)
        expect(again).toEqual({ error: 'Cette commande a déjà été traitée.' })
        expect(scheduled).toHaveLength(1)
    })
})

describe('Vendeur : « Paiement non reçu »', () => {
    it('annule, horodate le refus, remet le stock, prévient le client', async () => {
        const res = await applyVendorPaymentDecision('o1', 'v1', false, schedule)
        expect(res).toMatchObject({ success: true, outcome: 'rejected' })
        const o = db.orders[0]
        expect(o.status).toBe('rejected')
        expect(o.vendor_payments.v1.disputed).toBe(true)
        expect(o.vendor_payments.v1.vendor_disputed_at).toBeTruthy()
        expect(db.stockRestored).toEqual(['o1'])

        await flush()
        expect(sent.buyerEmails).toEqual([expect.objectContaining({ decision: 'refused', shop: 'Boutique Élégance' })])
        const buyerNotif = sent.notifications.find(n => n.userId === 'buyer1')!
        expect(buyerNotif.body).toContain('066262864')
    })
})

describe('Panier multi-vendeurs', () => {
    beforeEach(() => {
        db.orders = [order({
            items: [
                { id: 'p1', name: 'Robe', quantity: 1, price: 25000, seller_id: 'v1' },
                { id: 'p2', name: 'Gâteau', quantity: 1, price: 10000, seller_id: 'v2' },
            ],
            vendor_payments: {
                v1: { amount: 25000, transaction_id: '1111111111', vendor_confirmed: false, disputed: false },
                v2: { amount: 10000, transaction_id: '2222222222', vendor_confirmed: false, disputed: false },
            },
        })]
    })

    it('1er vendeur valide : commande en attente du 2e, client prévenu', async () => {
        const res = await applyVendorPaymentDecision('o1', 'v1', true, schedule)
        expect(res).toMatchObject({ outcome: 'waiting_others' })
        expect(db.orders[0].status).toBe('pending')
        await flush()
        expect(sent.buyerEmails).toEqual([expect.objectContaining({ decision: 'partial', shop: 'Boutique Élégance' })])
    })

    it('les 2 valident : commande confirmée', async () => {
        await applyVendorPaymentDecision('o1', 'v1', true, schedule)
        const res = await applyVendorPaymentDecision('o1', 'v2', true, schedule)
        expect(res).toMatchObject({ outcome: 'confirmed' })
        expect(db.orders[0].status).toBe('confirmed')
    })

    it('le 2e refuse après que le 1er a encaissé : annulation + demande de remboursement au 1er', async () => {
        await applyVendorPaymentDecision('o1', 'v1', true, schedule)
        await flush()
        const res = await applyVendorPaymentDecision('o1', 'v2', false, schedule)
        expect(res).toMatchObject({ outcome: 'rejected' })
        await flush()
        expect(sent.vendorCancelledEmails).toEqual([{ to: 'v1@example.com', alreadyConfirmed: true }])
        expect(sent.notifications.some(n => n.userId === 'v1' && n.body.includes('Remboursez'))).toBe(true)
    })
})

describe('Sécurité', () => {
    it('un vendeur étranger à la commande ne peut rien faire', async () => {
        const res = await applyVendorPaymentDecision('o1', 'intrus', true, schedule)
        expect(res).toEqual({ error: 'Aucun paiement associé à votre compte pour cette commande' })
        expect(db.orders[0].status).toBe('pending')
    })
})

describe('Le client corrige son code', () => {
    it('le vendeur voit le nouveau code et reçoit une notification', async () => {
        await syncBuyerTransactionToVendors('o1', 'buyer1', '5555555555', schedule)
        expect(db.orders[0].vendor_payments.v1.transaction_id).toBe('5555555555')
        await flush()
        expect(sent.notifications).toEqual([expect.objectContaining({ userId: 'v1', type: 'payment_declared' })])
        expect(sent.pushes).toHaveLength(1)
    })

    it('un autre client ne peut pas modifier la commande', async () => {
        await syncBuyerTransactionToVendors('o1', 'autre', '5555555555', schedule)
        expect(db.orders[0].vendor_payments.v1.transaction_id).toBe('1234567890')
    })
})
