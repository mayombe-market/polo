/**
 * Métadonnées « annonce immobilière » stockées dans `products.listing_extras` (jsonb).
 * La catégorie produit reste `Immobilier` ; le détail métier est versionné ici.
 */

export const IMMOBILIER_CATEGORY = 'Immobilier'

/** Sous-catégories proposées dans le formulaire vendeur (alignées stratégie Congo). */
export const IMMOBILIER_SUBCATEGORIES = [
    'Maisons',
    'Appartements',
    'Terrains',
    'Luxe',
    'Hôtels',
    'Villas',
    'Locations',
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
/** Badge visuel par sous-catégorie (couleurs inspirées de l'immobilier pro). */
export const IMMO_SUBCATEGORY_BADGES: Record<string, { label: string; bg: string; text: string; darkBg: string; darkText: string }> = {
    Maisons:       { label: 'Maison',      bg: 'bg-emerald-100', text: 'text-emerald-800', darkBg: 'dark:bg-emerald-900/60', darkText: 'dark:text-emerald-200' },
    Appartements:  { label: 'Appartement', bg: 'bg-blue-100',    text: 'text-blue-800',    darkBg: 'dark:bg-blue-900/60',    darkText: 'dark:text-blue-200' },
    Terrains:      { label: 'Terrain',     bg: 'bg-lime-100',    text: 'text-lime-800',    darkBg: 'dark:bg-lime-900/60',    darkText: 'dark:text-lime-200' },
    Luxe:          { label: 'Luxe',        bg: 'bg-purple-100',  text: 'text-purple-800',  darkBg: 'dark:bg-purple-900/60',  darkText: 'dark:text-purple-200' },
    'Hôtels':      { label: 'Hôtel',       bg: 'bg-amber-100',   text: 'text-amber-800',   darkBg: 'dark:bg-amber-900/60',   darkText: 'dark:text-amber-200' },
    Villas:        { label: 'Villa',       bg: 'bg-rose-100',    text: 'text-rose-800',    darkBg: 'dark:bg-rose-900/60',    darkText: 'dark:text-rose-200' },
    Locations:     { label: 'Location',    bg: 'bg-teal-100',    text: 'text-teal-800',    darkBg: 'dark:bg-teal-900/60',    darkText: 'dark:text-teal-200' },
}

/** Titres et sous-titres par sous-catégorie pour la page listing. */
export const IMMO_SUBCATEGORY_HEADERS: Record<string, { title: string; subtitle: string }> = {
    '':             { title: 'Tous les biens disponibles',  subtitle: 'Cliquez sur un bien pour voir tous les détails' },
    Maisons:        { title: 'Maisons à louer & acheter',   subtitle: 'Résidences principales et secondaires' },
    Appartements:   { title: 'Appartements disponibles',    subtitle: 'Studios, T2 à T5 et plus' },
    Terrains:       { title: 'Terrains à acquérir',         subtitle: 'Constructibles, agricoles, parcelles' },
    Luxe:           { title: 'Biens de prestige',           subtitle: 'Sélection exclusive haut de gamme' },
    'Hôtels':       { title: 'Hôtels & suites',            subtitle: 'Chambres & suites de qualité' },
    Villas:         { title: "Villas d'exception",          subtitle: 'Propriétés haut de gamme' },
    Locations:      { title: 'Locations disponibles',       subtitle: 'Biens à louer à Brazzaville & Pointe-Noire' },
}

export function formatRealEstatePriceLabel(
    priceFcfa: number,
    extras: RealEstateListingExtrasV1 | null,
): string {
    if (extras?.priceOnRequest) return 'Prix sur demande'
    if (extras?.priceNegotiable && (!priceFcfa || priceFcfa < 100)) return 'Prix à négocier'
    if (!priceFcfa || priceFcfa < 100) return 'Prix sur demande'
    return `${new Intl.NumberFormat('fr-FR').format(priceFcfa)} FCFA`
}
