/**
 * Comparaison ville acheteur / vendeur pour la logistique et les frais.
 */

/** Libellé affichage officiel (cohérent partout dans l’UI). */
export const DISPLAY_BRAZZAVILLE = 'Brazzaville'
export const DISPLAY_POINTE_NOIRE = 'Pointe-Noire'

/** Codes stockés en base (`profiles.city`, checkout). */
export type ServiceCityCode = 'brazzaville' | 'pointe-noire'

/**
 * Reconnaît Brazzaville / Pointe-Noire même avec variantes d’écriture :
 * `Pointe-Noire`, `Pointe Noire`, `POINTE-NOIRE`, `pointenoire`, etc.
 * Retourne le code canonique ou `null` si ce n’est ni l’un ni l’autre.
 */
export function normalizeToServiceCityCode(city: string | null | undefined): ServiceCityCode | null {
    if (!city || typeof city !== 'string' || !city.trim()) return null
    let s = city
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
    s = s.replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

    if (s === 'brazzaville' || s === 'bzv') return 'brazzaville'
    if (s === 'pointe-noire' || s === 'pointenoire') return 'pointe-noire'
    return null
}

export function isValidServiceCity(city: string | null | undefined): boolean {
    return normalizeToServiceCityCode(city) !== null
}

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
    const bc = normalizeToServiceCityCode(buyerCity)
    const vc = normalizeToServiceCityCode(vendorCity)
    if (bc && vc) return bc === vc
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
    const bCanon = normalizeToServiceCityCode(buyerDeliveryCity)
    const b = bCanon ?? normalizeCityName(buyerDeliveryCity).replace(/[\s_]+/g, '-')
    if (!b) return false
    for (const sc of sellerCities) {
        const sCanon = normalizeToServiceCityCode(sc)
        const s = sCanon ?? normalizeCityName(sc).replace(/[\s_]+/g, '-')
        if (!s) return true
        if (s !== b) return true
    }
    return false
}

/**
 * Aligner la ville saisie au checkout (ex. « Brazzaville ») sur les codes profil (`brazzaville`, `pointe-noire`).
 */
export function orderCityToProfileCity(city: string | null | undefined): string {
    const c = normalizeToServiceCityCode(city)
    if (c) return c
    return (city ?? '').trim()
}

/** Affichage checkout (DELIVERY_CITY_LIST) depuis une valeur profil `brazzaville` / `pointe-noire`. */
export function profileCityToCheckoutDisplay(city: string | null | undefined): string {
    const c = normalizeToServiceCityCode(city)
    if (c === 'brazzaville') return DISPLAY_BRAZZAVILLE
    if (c === 'pointe-noire') return DISPLAY_POINTE_NOIRE
    return (city ?? '').trim()
}

/** Message UX résumé panier (inter-ville). */
export const INTER_URBAN_DELIVERY_HINT =
    'Livraison inter-ville : forfait 3 500 FCFA, délais 24 h à 96 h. Vous confirmerez avant le paiement.'
