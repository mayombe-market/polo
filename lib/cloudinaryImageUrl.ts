/**
 * URLs de **delivery** Cloudinary (navigateur → res.cloudinary.com directement, sans `/_next/image`).
 * Les transformations (`f_auto`, `q_auto`, etc.) sont injectées **dans le chemin** après `image/upload/`.
 *
 * @see https://cloudinary.com/documentation/image_transformation_reference
 */

const CLOUDINARY_IMAGE_UPLOAD = '/image/upload/'

/** URL de livraison Cloudinary image (hors API upload). */
export function isCloudinaryDeliveryUrl(url: string): boolean {
    const s = (url ?? '').trim()
    if (!s.includes('res.cloudinary.com')) return false
    return s.includes(CLOUDINARY_IMAGE_UPLOAD)
}

/**
 * Format + qualité auto (`f_auto,q_auto`) — léger, adapté au client, sans repasser par Vercel.
 */
export function withCloudinaryAutoFormat(url: string): string {
    const u = (url ?? '').trim()
    if (!u || !isCloudinaryDeliveryUrl(u)) return url
    if (u.includes('f_auto,q_auto')) return url
    return u.replace(CLOUDINARY_IMAGE_UPLOAD, `${CLOUDINARY_IMAGE_UPLOAD}f_auto,q_auto/`)
}

/**
 * Vignettes grille catalogue : largeur bornée + `f_auto,q_auto` (même marge Cloudinary, pas Vercel).
 */
export function withCloudinaryCatalogThumb(url: string): string {
    const u = (url ?? '').trim()
    if (!u || !isCloudinaryDeliveryUrl(u)) return url
    const thumb = 'w_480,c_limit,f_auto,q_auto'
    if (u.includes(thumb)) return u
    if (u.includes('/image/upload/f_auto,q_auto/')) {
        return u.replace('/image/upload/f_auto,q_auto/', `/image/upload/${thumb}/`)
    }
    /** Déjà une chaîne `w_…` custom : laisser l’URL telle quelle. */
    if (/\/image\/upload\/w_/.test(u)) {
        return u
    }
    return u.replace(CLOUDINARY_IMAGE_UPLOAD, `/image/upload/${thumb}/`)
}
