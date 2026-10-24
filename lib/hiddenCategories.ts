import { FEATURES } from '@/lib/featureFlags'

/**
 * Catégories des modules désactivés (voir `FEATURES`) : les produits restent en base,
 * mais ne sont affichés nulle part sur le site public. Réactiver le flag les fait réapparaître.
 */
export const HIDDEN_CATEGORIES: readonly string[] = [
    ...(FEATURES.patisserie ? [] : ['Pâtisserie & Traiteur']),
]

export function isHiddenCategory(category: unknown): boolean {
    return typeof category === 'string' && HIDDEN_CATEGORIES.includes(category)
}

/** Ajoute `category <> X` pour chaque catégorie masquée à une requête Supabase sur `products`. */
export function excludeHiddenCategories<Q extends { neq(column: string, value: unknown): Q }>(query: Q): Q {
    return HIDDEN_CATEGORIES.reduce<Q>((q, category) => q.neq('category', category), query)
}
