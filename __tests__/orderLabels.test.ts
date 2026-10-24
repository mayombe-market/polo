import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
process.env.SUPABASE_SERVICE_ROLE_KEY = 'cle-de-test'

type Row = Record<string, any>
const db: { orders: Row[]; ratings: Row[]; profiles: Row[] } = { orders: [], ratings: [], profiles: [] }
let currentUser: string | null = 'v1'

function table(name: 'orders' | 'ratings' | 'profiles') {
    const filters: Array<(r: Row) => boolean> = []
    let patch: Row | null = null
    const api: any = {
        select: () => api,
        eq: (c: string, v: unknown) => { filters.push(r => r[c] === v); return api },
        in: (c: string, v: unknown[]) => { filters.push(r => v.includes(r[c])); return api },
        update: (p: Row) => { patch = p; return api },
        insert: async (row: Row) => {
            if (name === 'ratings') {
                if (db.ratings.some(r => r.order_id === row.order_id)) return { error: { code: '23505' } }
                if (!row.user_id) return { error: { code: '23502' } }
            }
            db[name].push(row); return { error: null }
        },
        maybeSingle: async () => ({ data: db[name].find(r => filters.every(f => f(r))) ?? null }),
        single: async () => ({ data: db[name].find(r => filters.every(f => f(r))) ?? null }),
        then: (resolve: (v: unknown) => void) => {
            const rows = db[name].filter(r => filters.every(f => f(r)))
            if (patch) rows.forEach(r => Object.assign(r, patch))
            resolve({ data: rows, error: null })
        },
    }
    return api
}

vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: table }) }))
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: currentUser ? { id: currentUser } : null } }) } }) }))
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }))

const { ratingToken, verifyRatingToken, ratingUrl } = await import('@/lib/orderRatingLink')
const { getRatingContext, submitRatingWithToken } = await import('@/lib/orderRatingServer')
const { getMyOrderLabels } = await import('@/app/actions/orderLabels')
const { labelPosition, pdfSafe, LABELS_PER_PAGE } = await import('@/lib/orderLabelPdf')

const O1 = '11111111-1111-4111-8111-111111111111'
const O2 = '22222222-2222-4222-8222-222222222222'

beforeEach(() => {
    currentUser = 'v1'
    db.ratings = []
    db.profiles = [
        { id: 'v1', role: 'vendor', shop_name: 'Élégance Congo', loyalty_points: 0 },
        { id: 'buyer1', role: 'buyer', loyalty_points: 100 },
    ]
    db.orders = [
        { id: O1, order_number: 79, created_at: '2026-10-24T08:00:00Z', status: 'confirmed', customer_name: 'Christelle Mabiala', user_id: 'buyer1', client_confirmed: false, items: [{ name: 'Robe', seller_id: 'v1' }] },
        { id: O2, order_number: 80, created_at: '2026-10-24T09:00:00Z', status: 'pending', customer_name: 'Paul', user_id: null, items: [{ name: 'Sac', seller_id: 'autre' }] },
    ]
})

describe('lien de notation signé', () => {
    it('aller-retour', () => {
        expect(verifyRatingToken(ratingToken(O1))).toBe(O1)
        expect(ratingUrl(O1)).toBe(`https://www.mayombe-market.com/noter/${ratingToken(O1)}`)
    })
    it('refuse un lien modifié ou fabriqué pour une autre commande', () => {
        const sig = ratingToken(O1).split('.')[1]
        expect(verifyRatingToken(`${O2}.${sig}`)).toBeNull()
        expect(verifyRatingToken(`${O1}.x${sig.slice(1)}`)).toBeNull()
        expect(verifyRatingToken('nimporte-quoi')).toBeNull()
    })
})

describe('page « Noter ma commande »', () => {
    it('ouverte pour une commande confirmée, avec la boutique et le prénom', async () => {
        expect(await getRatingContext(ratingToken(O1))).toMatchObject({ state: 'open', shopName: 'Élégance Congo', firstName: 'Christelle', orderNumber: 'MM-261024-0079' })
    })
    it('fermée tant que la commande n’est pas confirmée', async () => {
        expect((await getRatingContext(ratingToken(O2))).state).toBe('not_ready')
    })
    it('lien invalide', async () => {
        expect((await getRatingContext('faux'))).toEqual({ state: 'invalid' })
    })
    it('enregistre l’avis, confirme la réception, donne 500 points', async () => {
        const res = await submitRatingWithToken(ratingToken(O1), { vendorRating: 5, vendorTags: ['Bien emballé', 'tag inventé'], comment: ' Super ' })
        expect(res).toEqual({ success: true })
        expect(db.ratings[0]).toMatchObject({ order_id: O1, user_id: 'buyer1', vendor_rating: 5, vendor_tags: ['Bien emballé'], comment: 'Super' })
        expect(db.orders[0].client_confirmed).toBe(true)
        expect(db.profiles[1].loyalty_points).toBe(600)
        expect((await getRatingContext(ratingToken(O1))).state).toBe('already_rated')
    })
    it('un seul avis par commande', async () => {
        await submitRatingWithToken(ratingToken(O1), { vendorRating: 5 })
        expect(await submitRatingWithToken(ratingToken(O1), { vendorRating: 1 })).toEqual({ error: 'Un avis a déjà été laissé pour cette commande. Merci !' })
    })
    it('refuse une note invalide ou vide', async () => {
        expect(await submitRatingWithToken(ratingToken(O1), { vendorRating: 7 })).toEqual({ error: 'Les notes doivent être entre 1 et 5.' })
        expect(await submitRatingWithToken(ratingToken(O1), {})).toEqual({ error: 'Donnez au moins une note.' })
    })
    it('client sans compte avant la migration : message clair', async () => {
        db.orders[0].user_id = null
        expect(await submitRatingWithToken(ratingToken(O1), { vendorRating: 4 })).toEqual({ error: 'Les avis sans compte client seront bientôt disponibles. Merci de votre patience !' })
    })
})

describe('étiquettes du vendeur', () => {
    it('uniquement ses commandes confirmées, avec lien de notation', async () => {
        const res = await getMyOrderLabels([O1, O2])
        expect(res).toEqual({ labels: [{ orderId: O1, orderNumber: 'MM-261024-0079', shopName: 'Élégance Congo', customerFirstName: 'Christelle', ratingUrl: ratingUrl(O1) }] })
    })
    it('réservé aux vendeurs connectés', async () => {
        currentUser = 'buyer1'
        expect(await getMyOrderLabels([O1])).toEqual({ error: 'Réservé aux vendeurs.' })
        currentUser = null
        expect(await getMyOrderLabels([O1])).toEqual({ error: 'Session expirée : reconnectez-vous.' })
    })
})

describe('mise en page A4', () => {
    it('8 étiquettes par page, en 2 colonnes', () => {
        expect(LABELS_PER_PAGE).toBe(8)
        expect(labelPosition(0)).toEqual({ page: 0, x: 4.65, y: 13.1 })
        expect(labelPosition(1).x).toBeCloseTo(106.25)
        expect(labelPosition(7).y).toBeCloseTo(13.1 + 3 * 67.7)
        expect(labelPosition(8)).toEqual({ page: 1, x: 4.65, y: 13.1 })
    })
    it('texte compatible PDF', () => {
        expect(pdfSafe('Heaven shops 💄')).toBe('Heaven shops')
        expect(pdfSafe('L’Élégance « Congo »')).toBe("L'Élégance « Congo »")
    })
})
