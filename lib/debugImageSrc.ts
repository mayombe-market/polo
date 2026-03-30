/**
 * Debug opt-in des `src` d’images (aucun impact prod si la variable n’est pas activée).
 * Active avec `NEXT_PUBLIC_DEBUG_IMAGE_SRC=1` dans `.env.local` ou Vercel.
 *
 * Objectif : vérifier qu’aucune URL ne pointe vers `/_next/image` ou `image?url=`.
 */

function isSuspiciousOptimizerUrl(src: string): boolean {
    return src.includes('/_next/image') || src.includes('image?url=') || src.includes('/_next/image?')
}

export function debugImageSrc(scope: string, src: string | undefined | null): void {
    if (process.env.NEXT_PUBLIC_DEBUG_IMAGE_SRC !== '1') return
    if (src == null || src === '') return
    const s = String(src)
    if (isSuspiciousOptimizerUrl(s)) {
        console.warn(`[Mayombe IMAGE] ${scope} — URL suspecte (optimizer Vercel) :`, s)
    } else {
        console.log('[Mayombe IMAGE SRC]', scope, s)
    }
}
