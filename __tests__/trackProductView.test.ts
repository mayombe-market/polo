import { describe, it, expect, vi, beforeEach } from 'vitest'

let products: Record<string, { views_count: number | null }> = {}
let events: Array<Record<string, unknown>> = []

function table(name: string) {
    const filters: Array<[string, unknown]> = []
    let patch: Record<string, unknown> | null = null
    const api: any = {
        select: () => api,
        eq: (c: string, v: unknown) => { filters.push([c, v]); return api },
        gte: () => api,
        is: () => api,
        update: (p: Record<string, unknown>) => { patch = p; return api },
        insert: async (row: Record<string, unknown>) => { events.push({ ...row, created_at: new Date().toISOString() }); return { error: null } },
        maybeSingle: async () => {
            const id = filters.find(([c]) => c === 'id')?.[1] as string
            return { data: products[id] ?? null }
        },
        then: (resolve: (v: unknown) => void) => {
            if (name === 'products' && patch) {
                const id = filters.find(([c]) => c === 'id')?.[1] as string
                Object.assign(products[id], patch)
                return resolve({ error: null })
            }
            const match = events.filter(e => filters.every(([c, v]) => e[c] === v))
            resolve({ count: match.length })
        },
    }
    return api
}

vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ from: table }) }))
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }))

const { trackEvent } = await import('@/app/actions/analytics')
const view = (session: string) => trackEvent({ shop_id: 's1', product_id: 'p1', event_type: 'product_view', session_id: session, source: 'direct' })

beforeEach(() => { products = { p1: { views_count: 4 } }; events = [] })

describe('compteur de vues produit', () => {
    it('une visite augmente le compteur de 1 et est enregistrée', async () => {
        await view('sess-a')
        expect(products.p1.views_count).toBe(5)
        expect(events).toHaveLength(1)
    })
    it('le même visiteur dans l’heure ne compte qu’une fois', async () => {
        await view('sess-a')
        await view('sess-a')
        expect(products.p1.views_count).toBe(5)
    })
    it('deux visiteurs différents comptent deux fois', async () => {
        await view('sess-a')
        await view('sess-b')
        expect(products.p1.views_count).toBe(6)
    })
    it('compteur vide (null) : passe à 1', async () => {
        products.p1.views_count = null
        await view('sess-a')
        expect(products.p1.views_count).toBe(1)
    })
})
