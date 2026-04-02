/**
 * Libellé boutique pour les cartes produit (colonne `shop` et/ou profil vendeur joint).
 */
export type ProductShopFields = {
    shop?: string | null
    store_name?: string | null
    shop_name?: string | null
    profiles?:
        | {
              store_name?: string | null
              shop_name?: string | null
              full_name?: string | null
              name?: string | null
          }
        | {
              store_name?: string | null
              shop_name?: string | null
              full_name?: string | null
              name?: string | null
          }[]
        | null
}

export function getProductShopLabel(product: ProductShopFields | null | undefined): string {
    if (!product || typeof product !== 'object') return 'Boutique'

    const s = typeof product.shop === 'string' ? product.shop.trim() : ''
    if (s) return s

    const st = typeof product.store_name === 'string' ? product.store_name.trim() : ''
    if (st) return st

    const sh = typeof product.shop_name === 'string' ? product.shop_name.trim() : ''
    if (sh) return sh

    const pr = product.profiles
    if (Array.isArray(pr) && pr[0] && typeof pr[0] === 'object') {
        const n = pr[0] as { store_name?: string; shop_name?: string; full_name?: string; name?: string }
        const t = (n.store_name || n.shop_name || n.full_name || n.name || '').trim()
        if (t) return t
    } else if (pr && typeof pr === 'object' && !Array.isArray(pr)) {
        const n = pr as { store_name?: string; shop_name?: string; full_name?: string; name?: string }
        const t = (n.store_name || n.shop_name || n.full_name || n.name || '').trim()
        if (t) return t
    }

    return 'Boutique'
}
