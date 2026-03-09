/** Vérifie si un produit a une promo active */
export function isPromoActive(product: {
    promo_percentage?: number | null
    promo_end_date?: string | null
}): boolean {
    if (!product?.promo_percentage || !product?.promo_end_date) return false
    return product.promo_percentage > 0 && new Date(product.promo_end_date) > new Date()
}

/** Calcule le prix après réduction */
export function getPromoPrice(product: {
    price: number
    promo_percentage?: number | null
    promo_end_date?: string | null
}): number {
    if (!isPromoActive(product)) return product.price
    return Math.round(product.price * (1 - (product.promo_percentage || 0) / 100))
}

/** Retourne le temps restant de la promo sous forme lisible */
export function getPromoTimeRemaining(promoEndDate: string | null | undefined): string {
    if (!promoEndDate) return ''
    const end = new Date(promoEndDate)
    const now = new Date()
    const diffMs = end.getTime() - now.getTime()

    if (diffMs <= 0) return 'Expirée'

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days}j ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}min`
    return `${minutes}min`
}
