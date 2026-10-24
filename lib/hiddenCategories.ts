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
// Typage volontairement lâche : contraindre Q sur les builders Supabase fait exploser le compilateur (TS2589)
export function excludeHiddenCategories<Q>(query: Q): Q {
    let q = query as unknown as { neq(column: string, value: string): unknown }
    for (const category of HIDDEN_CATEGORIES) q = q.neq('category', category) as typeof q
    return q as unknown as Q
}
