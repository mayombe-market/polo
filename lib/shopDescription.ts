/** Slogan affiché sur la boutique et sous le nom du vendeur sur la fiche produit. */
export const SHOP_DESCRIPTION_MAX_LENGTH = 75

export function normalizeShopDescription(value: string | null | undefined): string | null {
    const t = (value ?? '').trim()
    if (!t) return null
    return t.slice(0, SHOP_DESCRIPTION_MAX_LENGTH)
}
