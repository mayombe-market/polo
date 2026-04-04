import type { ProductCardProduct } from '@/app/components/ProductCard'

export type TileCampaignSlide = {
    id: string
    title?: string | null
    description?: string | null
    image_url: string
    link_url: string
}

export type PubProductMixSlide =
    | { type: 'product'; product: ProductCardProduct }
    | { type: 'tile'; campaign: TileCampaignSlide; slot: number }

function isReady(p: ProductCardProduct | null | undefined): boolean {
    if (!p || typeof p !== 'object') return false
    const id = typeof p.id === 'string' && p.id.trim().length > 0
    const name = typeof p.name === 'string' && p.name.trim().length > 0
    const price = typeof p.price === 'number' && Number.isFinite(p.price)
    return id && name && price
}

/**
 * Ordre : 1 produit → tuile pub → 3 produits → tuile → 3 produits → …
 * Les tuiles tournent sur `campaigns` (mêmes pubs, positions différentes dans le fil).
 * Sans campagnes : file de produits uniquement (équivalent tendances).
 */
export function buildPubProductMixSlides(
    products: ProductCardProduct[],
    campaigns: TileCampaignSlide[],
): PubProductMixSlide[] {
    const ready = products.filter(isReady)
    if (ready.length === 0) return []

    if (campaigns.length === 0) {
        return ready.map((product) => ({ type: 'product', product }) as const)
    }

    const slides: PubProductMixSlide[] = [{ type: 'product', product: ready[0] }]
    let pi = 1
    let ti = 0

    if (pi >= ready.length) {
        slides.push({ type: 'tile', campaign: campaigns[ti % campaigns.length], slot: ti })
        return slides
    }

    while (pi < ready.length) {
        slides.push({ type: 'tile', campaign: campaigns[ti % campaigns.length], slot: ti })
        ti++
        for (let k = 0; k < 3 && pi < ready.length; k++) {
            slides.push({ type: 'product', product: ready[pi++] })
        }
    }

    return slides
}
