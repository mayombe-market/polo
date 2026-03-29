/**
 * Complète une URL d’image produit lorsque la base ne stocke qu’un chemin ou nom de fichier
 * dans le bucket Storage public `products` (ex. `1774382…-main.jpg`).
 *
 * URL publique : `{NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/{path}`
 */

const PRODUCTS_BUCKET = 'products'

function supabaseProjectBase(): string {
    return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')
}

/**
 * Si `raw` est déjà une URL absolue (https) ou une ressource locale (`/`, `data:`, `blob:`), renvoie tel quel.
 * Sinon, construit l’URL publique du bucket `products`.
 */
export function normalizeProductImageUrl(raw: string | undefined | null): string {
    let s = (raw ?? '').trim()
    if (!s) return ''

    if (/^https?:\/\//i.test(s)) {
        try {
            const u = new URL(s)
            if (u.pathname.includes(`/object/public/${PRODUCTS_BUCKET}/`)) {
                u.search = ''
                return u.toString()
            }
        } catch {
            /* ignore */
        }
        return s
    }
    if (s.startsWith('/')) return s
    if (/^(blob:|data:)/i.test(s)) return s

    const q = s.indexOf('?')
    if (q !== -1) s = s.slice(0, q).trim()

    const base = supabaseProjectBase()
    if (!base) return s

    const pathInBucket = s.replace(/^\/+/, '')
    if (!pathInBucket || pathInBucket.includes('..')) return s

    const encoded = pathInBucket.split('/').filter(Boolean).map((seg) => encodeURIComponent(seg)).join('/')
    return `${base}/storage/v1/object/public/${PRODUCTS_BUCKET}/${encoded}`
}
