/**
 * Texte utilisateur affiché dans l’UI ou les balises <title> : pas de HTML,
 * pas de caractères de contrôle, longueur bornée (complète l’échappement React sur les nœuds texte).
 */
export function sanitizeSearchQueryForDisplay(raw: string, maxLen = 200): string {
    if (typeof raw !== 'string') return ''
    return raw
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .trim()
        .slice(0, maxLen)
}

/** Segment de titre d’onglet (évite de casser le template « %s | Mayombe Market »). */
export function sanitizePageTitleSegment(raw: string, maxLen = 70): string {
    return sanitizeSearchQueryForDisplay(raw, maxLen).replace(/\|/g, ' ')
}
