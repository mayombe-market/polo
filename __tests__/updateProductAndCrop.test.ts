import { describe, it, expect, vi, beforeEach } from 'vitest'
import { rotatedSize, downscaleFactor } from '@/lib/cropImage'

let row: Record<string, unknown>
let lastUpdate: Record<string, unknown> | null

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }) }))
vi.mock('@/app/actions/revalidate', () => ({ revalidateProductCatalog: async () => {} }))
vi.mock('@supabase/ssr', () => ({
    createServerClient: () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'vendeur1' } } }) },
        from: () => {
            const api: any = {
                select: () => api,
                eq: () => api,
                update: (u: Record<string, unknown>) => { lastUpdate = u; return api },
                single: async () => (lastUpdate ? { data: { ...row, ...lastUpdate }, error: null } : { data: row, error: null }),
            }
            return api
        },
    }),
}))

const { updateProduct } = await import('@/app/actions/orders')

beforeEach(() => {
    lastUpdate = null
    row = { seller_id: 'vendeur1', has_stock: true, stock_quantity: 7, options: [{ name: 'Taille', values: ['M'] }], img: 'https://res.cloudinary.com/a.jpg', images_gallery: ['https://res.cloudinary.com/b.jpg'] }
})

describe('updateProduct — modification partielle', () => {
    it('modifier nom / prix ne touche ni au stock, ni aux options, ni aux photos', async () => {
        await updateProduct('p1', { name: 'Robe', price: 5000, description: 'Belle', subcategory: 'Robes' })
        expect(lastUpdate).toEqual({ name: 'Robe', price: 5000, description: 'Belle', subcategory: 'Robes' })
    })

    it('photos : principale + galerie, sans doublon de la principale', async () => {
        await updateProduct('p1', {
            name: 'Robe', price: 5000,
            img: 'https://res.cloudinary.com/c.jpg',
            images_gallery: ['https://res.cloudinary.com/c.jpg', 'https://res.cloudinary.com/d.jpg', 'pas-une-url'],
        })
        expect(lastUpdate).toMatchObject({ img: 'https://res.cloudinary.com/c.jpg', images_gallery: ['https://res.cloudinary.com/d.jpg'] })
    })

    it('refuse plus de 5 photos de galerie', async () => {
        const res = await updateProduct('p1', { name: 'Robe', price: 5000, images_gallery: Array.from({ length: 6 }, (_, i) => `https://x/${i}.jpg`) })
        expect(res).toEqual({ error: 'Maximum 5 photos dans la galerie.' })
    })

    it('la pâtisserie peut toujours régler stock et options', async () => {
        await updateProduct('p1', { name: 'Gâteau', price: 9000, has_stock: true, stock_quantity: 3, options: [] })
        expect(lastUpdate).toMatchObject({ has_stock: true, stock_quantity: 3, options: [] })
    })

    it('quantité invalide refusée', async () => {
        expect(await updateProduct('p1', { name: 'X', price: 1, stock_quantity: -2 })).toEqual({ error: 'Quantité en stock invalide.' })
    })
})

describe('recadrage — calculs', () => {
    it('image tournée de 90° : largeur et hauteur échangées', () => {
        const r = rotatedSize(4000, 3000, 90)
        expect(Math.round(r.width)).toBe(3000)
        expect(Math.round(r.height)).toBe(4000)
    })
    it('photo trop grande réduite à 1600 px de côté', () => {
        expect(downscaleFactor(3200, 4000)).toBeCloseTo(0.4)
        expect(downscaleFactor(800, 1000)).toBe(1)
    })
})
