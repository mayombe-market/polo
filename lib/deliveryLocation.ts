/**
 * Comparaison ville acheteur / vendeur pour la logistique.
 * Pas de majoration automatique côté code : l’équipe peut ajuster les tarifs ou négocier avec le logisticien.
 */

/** Normalise pour comparaison (casse, espaces, accents basiques). */
export function normalizeCityName(city: string | null | undefined): string {
    if (!city || typeof city !== 'string') return ''
    return city
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
}

/**
 * Livraison « locale » = même ville (après normalisation).
 */
export function isLocalDelivery(
    buyerCity: string | null | undefined,
    vendorCity: string | null | undefined
): boolean {
    const a = normalizeCityName(buyerCity)
    const b = normalizeCityName(vendorCity)
    if (!a || !b) return true
    return a === b
}

/** Message UX si au moins un vendeur est dans une autre ville. */
export const INTER_URBAN_DELIVERY_HINT =
    'Expédition inter-urbaine : délais ou frais peuvent différer. Un logisticien vous contactera si besoin.'
