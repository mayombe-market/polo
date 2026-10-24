type WithId = { id?: unknown }

const idOf = (p: WithId | null | undefined) => (p?.id != null && p.id !== '' ? String(p.id) : '')

/**
 * Deux produits pour l'encadré « confiance » de l'accueil : hors carrousel tendances si possible,
 * puis complétés avec les produits déjà affichés. null s'il y en a moins de deux.
 */
export function pickSideHighlightPair<T extends WithId>(pool: T[], trendProducts: WithId[]): [T, T] | null {
    const trendIds = new Set(trendProducts.map(idOf).filter(Boolean))
    const out: T[] = []
    const seen = new Set<string>()
    for (const allowTrend of [false, true]) {
        for (const p of pool) {
            const id = idOf(p)
            if (!id || seen.has(id) || (!allowTrend && trendIds.has(id))) continue
            seen.add(id)
            out.push(p)
            if (out.length >= 2) return [out[0], out[1]]
        }
    }
    return null
}
