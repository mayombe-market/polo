import { describe, it, expect, vi, beforeEach } from 'vitest'

// Table simulée sans index unique : un upsert ON CONFLICT y échouerait (42P10), comme en production.
let rows: Array<Record<string, unknown>> = []
let insertCalls = 0

function table() {
    const filters: Array<[string, unknown]> = []
    const api: any = {
        select: () => api,
        eq: (c: string, v: unknown) => { filters.push([c, v]); return api },
        limit: async () => ({ data: rows.filter(r => filters.every(([c, v]) => r[c] === v)), error: null }),
        insert: async (row: Record<string, unknown>) => { insertCalls++; rows.push(row); return { error: null } },
        upsert: async () => ({ error: { code: '42P10', message: 'there is no unique or exclusion constraint matching the ON CONFLICT specification' } }),
    }
    return api
}

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }) }))
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ from: () => table() }) }))

const { createNotification } = await import('@/app/actions/notifications')

beforeEach(() => { rows = []; insertCalls = 0 })

describe('createNotification sans index anti-doublon (état de la production)', () => {
    it('crée bien la notification de commande', async () => {
        await createNotification('vendeur1', 'new_order', 'Nouvelle commande', 'Robe', '/vendor/dashboard?tab=orders', 'o1:vendeur1')
        expect(rows).toEqual([expect.objectContaining({ user_id: 'vendeur1', type: 'new_order', reference_id: 'o1:vendeur1' })])
    })

    it('ne crée pas de doublon pour la même commande', async () => {
        await createNotification('vendeur1', 'new_order', 'A', 'B', undefined, 'o1:vendeur1')
        await createNotification('vendeur1', 'new_order', 'A', 'B', undefined, 'o1:vendeur1')
        expect(insertCalls).toBe(1)
    })

    it('une autre commande crée une autre notification', async () => {
        await createNotification('vendeur1', 'new_order', 'A', 'B', undefined, 'o1:vendeur1')
        await createNotification('vendeur1', 'new_order', 'A', 'B', undefined, 'o2:vendeur1')
        expect(rows).toHaveLength(2)
    })
})
