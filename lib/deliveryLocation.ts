/**
 * Comparaison ville acheteur / vendeur pour la logistique et les frais.
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
 * Si une des deux villes est vide, on considère « local » (rétrocompat) — les profils doivent désormais avoir une ville renseignée.
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

/**
 * True si au moins un vendeur est dans une ville différente de la ville de livraison de l’acheteur,
 * ou si la ville d’un vendeur est inconnue (on applique alors le forfait inter-ville côté checkout).
 */
export function orderRequiresInterUrbanDelivery(
    buyerDeliveryCity: string | null | undefined,
    sellerCities: (string | null | undefined)[]
): boolean {
    const b = normalizeCityName(buyerDeliveryCity)
    if (!b) return false
    for (const sc of sellerCities) {
        const s = normalizeCityName(sc)
        if (!s) return true
        if (s !== b) return true
    }
    return false
}

/**
 * Aligner la ville saisie au checkout (ex. « Brazzaville ») sur les codes profil (`brazzaville`, `pointe-noire`).
 */
export function orderCityToProfileCity(city: string | null | undefined): string {
    const n = normalizeCityName(city)
    if (n === 'brazzaville') return 'brazzaville'
    if (n === 'pointe-noire') return 'pointe-noire'
    return (city ?? '').trim()
}

/** Affichage checkout (DELIVERY_CITY_LIST) depuis une valeur profil `brazzaville` / `pointe-noire`. */
export function profileCityToCheckoutDisplay(city: string | null | undefined): string {
    const n = normalizeCityName(city)
    if (n === 'brazzaville') return 'Brazzaville'
    if (n === 'pointe-noire') return 'Pointe-Noire'
    return (city ?? '').trim()
}

/** Message UX résumé panier (inter-ville). */
export const INTER_URBAN_DELIVERY_HINT =
    'Livraison inter-ville : forfait 3 500 FCFA, délais 24 h à 96 h. Vous confirmerez avant le paiement.'
