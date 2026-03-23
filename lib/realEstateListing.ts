/**
 * Métadonnées « annonce immobilière » stockées dans `products.listing_extras` (jsonb).
 * La catégorie produit reste `Immobilier` ; le détail métier est versionné ici.
 */

export const IMMOBILIER_CATEGORY = 'Immobilier'

/** Sous-catégories proposées dans le formulaire vendeur (alignées stratégie Congo). */
export const IMMOBILIER_SUBCATEGORIES = [
    'Terrains & Parcelles',
    'Maisons & Villas (Vente)',
    'Locations (Maisons, Studios, Chambres)',
    'Commerces & Bureaux (Magasins à louer)',
] as const

export type RealEstateOfferType = 'vente' | 'location'

export interface RealEstateListingExtrasV1 {
    version: 1
    offerType: RealEstateOfferType
    /** Prix affiché comme négociable */
    priceNegotiable: boolean
    /** Masque le montant chiffré côté fiche */
    priceOnRequest: boolean
    city: string
    district: string
    street?: string
    surfaceValue?: number
    surfaceUnit: 'm2' | 'ares'
    rooms?: number
    bedrooms?: number
    /** État du bien */
    propertyCondition?: string
    /** Statut juridique / foncier */
    landLegalStatus?: string
    legalNotes?: string
}

export function isRealEstateProduct(product: { category?: string | null }): boolean {
    return (product.category || '').trim() === IMMOBILIER_CATEGORY
}

export function parseListingExtras(raw: unknown): RealEstateListingExtrasV1 | null {
    if (raw == null || typeof raw !== 'object') return null
    const o = raw as Record<string, unknown>
    if (o.version !== 1) return null
    if (o.offerType !== 'vente' && o.offerType !== 'location') return null
    if (typeof o.city !== 'string' || typeof o.district !== 'string') return null
    if (o.surfaceUnit !== 'm2' && o.surfaceUnit !== 'ares') return null
    return {
        version: 1,
        offerType: o.offerType,
        priceNegotiable: Boolean(o.priceNegotiable),
        priceOnRequest: Boolean(o.priceOnRequest),
        city: o.city.trim(),
        district: o.district.trim(),
        street: typeof o.street === 'string' ? o.street.trim() : undefined,
        surfaceValue: typeof o.surfaceValue === 'number' && Number.isFinite(o.surfaceValue) ? o.surfaceValue : undefined,
        surfaceUnit: o.surfaceUnit,
        rooms: typeof o.rooms === 'number' && o.rooms >= 0 ? o.rooms : undefined,
        bedrooms: typeof o.bedrooms === 'number' && o.bedrooms >= 0 ? o.bedrooms : undefined,
        propertyCondition: typeof o.propertyCondition === 'string' ? o.propertyCondition : undefined,
        landLegalStatus: typeof o.landLegalStatus === 'string' ? o.landLegalStatus : undefined,
        legalNotes: typeof o.legalNotes === 'string' ? o.legalNotes : undefined,
    }
}

export function buildListingExtrasV1(input: Omit<RealEstateListingExtrasV1, 'version'>): RealEstateListingExtrasV1 {
    return {
        version: 1,
        ...input,
        city: input.city.trim(),
        district: input.district.trim(),
        street: input.street?.trim() || undefined,
        legalNotes: input.legalNotes?.trim() || undefined,
    }
}

export function subcategoryNeedsSurface(subcategory: string): boolean {
    return subcategory.toLowerCase().includes('terrain')
}

/** Libellé prix pour fiche / partage */
export function formatRealEstatePriceLabel(
    priceFcfa: number,
    extras: RealEstateListingExtrasV1 | null,
): string {
    if (extras?.priceOnRequest) return 'Prix sur demande'
    if (extras?.priceNegotiable && (!priceFcfa || priceFcfa < 100)) return 'Prix à négocier'
    if (!priceFcfa || priceFcfa < 100) return 'Prix sur demande'
    return `${new Intl.NumberFormat('fr-FR').format(priceFcfa)} FCFA`
}
