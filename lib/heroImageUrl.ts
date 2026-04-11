/**
 * Optimisation des images du hero (LCP critique).
 *
 * Sans repasser par l'optimizer Next (`unoptimized: true` dans next.config.mjs),
 * on transforme directement l'URL côté CDN source :
 *  - Cloudinary  → `f_auto,q_auto,w_<W>,c_limit`
 *  - Supabase    → `/storage/v1/render/image/public/...?width=<W>&quality=70`
 *  - Unsplash    → `?w=<W>&q=70&auto=format&fit=crop`
 *  - Sinon       → URL renvoyée telle quelle.
 *
 * Cible LCP : passer d'environ 700–800 Ko à 80–150 Ko par slide.
 */

const CLOUDINARY_UPLOAD = '/image/upload/'

function isCloudinary(u: string): boolean {
    return u.includes('res.cloudinary.com') && u.includes(CLOUDINARY_UPLOAD)
}

function isSupabaseObjectPublic(u: string): boolean {
    return /\/storage\/v1\/object\/public\//.test(u)
}

function isUnsplash(u: string): boolean {
    try {
        const host = new URL(u).hostname
        return host === 'images.unsplash.com' || host.endsWith('.unsplash.com') || host === 'unsplash.com'
    } catch {
        return false
    }
}

/**
 * Renvoie une URL optimisée du visuel hero pour la largeur cible (px).
 * Si l'URL est inconnue, elle est renvoyée telle quelle.
 */
export function heroImageUrl(rawUrl: string | null | undefined, width: number): string {
    const url = (rawUrl ?? '').trim()
    if (!url) return ''
    const w = Math.max(320, Math.min(2000, Math.round(width)))

    if (isCloudinary(url)) {
        const transform = `f_auto,q_auto,w_${w},c_limit`
        if (url.includes(`/image/upload/${transform}/`)) return url
        // Évite d'empiler des transformations s'il y en a déjà une.
        if (/\/image\/upload\/[^/]*w_\d+/.test(url)) return url
        return url.replace(CLOUDINARY_UPLOAD, `${CLOUDINARY_UPLOAD}${transform}/`)
    }

    if (isSupabaseObjectPublic(url)) {
        const rendered = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
        const sep = rendered.includes('?') ? '&' : '?'
        return `${rendered}${sep}width=${w}&quality=70&resize=cover`
    }

    if (isUnsplash(url)) {
        try {
            const u = new URL(url)
            u.searchParams.set('w', String(w))
            u.searchParams.set('q', '70')
            u.searchParams.set('auto', 'format')
            u.searchParams.set('fit', 'crop')
            return u.toString()
        } catch {
            return url
        }
    }

    return url
}

/**
 * Génère un attribut `srcSet` multi-largeurs pour le hero (mobile → desktop).
 */
export function heroImageSrcSet(rawUrl: string | null | undefined): string {
    // Trimmé à 3 largeurs : mobile Lighthouse pioche 960w (412 CSS px × DPR 1.75).
    // Moins de variantes = moins de cache-misses côté Unsplash/Supabase en cold.
    const widths = [640, 960, 1280]
    return widths.map((w) => `${heroImageUrl(rawUrl, w)} ${w}w`).join(', ')
}

/**
 * Version vignette catalogue : même logique que heroImageUrl, mais largeur
 * par défaut beaucoup plus petite (540 px, suffisant pour les grilles 270×365
 * avec DPR 2). Utilisé par ProductCard / TrendProductCard.
 */
export function catalogImageUrl(rawUrl: string | null | undefined, width: number = 540): string {
    return heroImageUrl(rawUrl, width)
}
