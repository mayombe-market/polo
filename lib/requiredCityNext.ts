/** Paramètre `next` après /required-city : uniquement chemins internes relatifs. */
export function sanitizeInternalNext(next: string | null | undefined): string {
    if (!next || typeof next !== 'string') return '/'
    const t = next.trim()
    if (!t.startsWith('/') || t.startsWith('//')) return '/'
    if (t.startsWith('/required-city')) return '/'
    return t.length > 2048 ? '/' : t
}
