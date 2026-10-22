import { describe, it, expect, vi, beforeEach } from 'vitest'

type Row = Record<string, any>
const db: { orders: Row[]; profiles: Row[]; notifications: Row[] } = { orders: [], profiles: [], notifications: [] }
let role = 'admin'

function query(table: 'orders' | 'profiles' | 'notifications') {
    const filters: Array<(r: Row) => boolean> = []
    const api: any = {
        select: () => api,
        eq: (c: string, v: unknown) => { filters.push(r => r[c] === v); return api },
        like: (c: string, pattern: string) => { const p = pattern.replace('%', ''); filters.push(r => String(r[c]).startsWith(p)); return api },
        order: () => api,
        limit: async () => ({ data: db[table].filter(r => filters.every(f => f(r))).sort((a, b) => b.created_at.localeCompare(a.created_at)) }),
        single: async () => ({ data: db[table].find(r => filters.every(f => f(r))) ?? null }),
    }
    return api
}

vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: query }) }))
vi.mock('@supabase/ssr', () => ({
    createServerClient: () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'admin1' } } }) },
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role } }) }) }) }),
    }),
}))
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock('@/lib/adminZoneServer', () => ({ assertAdminCanActOnOrder: async () => ({}) }))
const sent = { emails: [] as any[], notifs: [] as any[], pushes: [] as any[] }
vi.mock('@/app/actions/emails', () => ({ sendVendorReminderEmail: async (to: string, d: any) => { sent.emails.push({ to, ...d }); return { success: true } } }))
vi.mock('@/app/actions/notifications', () => ({ createNotification: async (...a: any[]) => { sent.notifs.push(a) } }))
vi.mock('@/lib/pushServer', () => ({ sendPushToUsers: async (...a: any[]) => { sent.pushes.push(a) } }))

const { adminRemindVendor } = await import('@/app/actions/adminOrderFollowUp')

const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString()

beforeEach(() => {
    role = 'admin'
    sent.emails = []; sent.notifs = []; sent.pushes = []
    db.profiles = [{ id: 'v1', full_name: 'Moulounda', shop_name: 'Heaven shops', email: 'v1@example.com' }]
    db.notifications = []
    db.orders = [{
        id: 'o1', order_number: 79, created_at: ago(135), status: 'pending', order_type: 'product', payment_method: 'cash',
        customer_name: 'Nzaou Divin', items: [{ name: 'Lime', quantity: 1, price: 7500, seller_id: 'v1' }], vendor_payments: {},
    }]
})

describe('adminRemindVendor', () => {
    it('envoie email + notification + push avec le retard', async () => {
        const res = await adminRemindVendor('o1', 'v1')
        expect(res).toMatchObject({ success: true, emailed: true })
        expect(sent.emails[0]).toMatchObject({ to: 'v1@example.com', vendorName: 'Moulounda', delayLabel: '2 h 15', amount: 7500 })
        expect(sent.notifs[0][1]).toBe('order_reminder')
        expect(sent.notifs[0][5]).toMatch(/^o1:v1:/)
        expect(sent.pushes[0][0]).toEqual(['v1'])
    })

    it('refuse si le vendeur a déjà répondu', async () => {
        db.orders[0].status = 'confirmed'
        expect(await adminRemindVendor('o1', 'v1')).toEqual({ error: 'Ce vendeur a déjà répondu à cette commande.' })
        expect(sent.emails).toHaveLength(0)
    })

    it('refuse une 2e relance moins de 15 min après', async () => {
        db.notifications = [{ type: 'order_reminder', user_id: 'v1', reference_id: 'o1:v1:x', created_at: ago(5) }]
        const res = await adminRemindVendor('o1', 'v1')
        expect('error' in res && res.error).toContain('moins de 15 min')
        expect(sent.emails).toHaveLength(0)
    })

    it('refuse un vendeur qui n’est pas dans la commande', async () => {
        expect(await adminRemindVendor('o1', 'autre')).toEqual({ error: 'Ce vendeur ne fait pas partie de la commande.' })
    })

    it('réservé aux admins', async () => {
        role = 'vendor'
        expect(await adminRemindVendor('o1', 'v1')).toEqual({ error: 'Non autorisé' })
        expect(sent.notifs).toHaveLength(0)
    })
})
