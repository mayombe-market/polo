import 'server-only'

import { createHmac, timingSafeEqual } from 'crypto'

const SITE = 'https://www.mayombe-market.com'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function signature(orderId: string): string {
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!secret) throw new Error('Configuration serveur manquante.')
    return createHmac('sha256', secret).update(`order-rating:${orderId}`).digest('base64url').slice(0, 22)
}

/** Jeton imprimé sur l'étiquette colis : id de commande + signature (impossible à fabriquer pour une autre commande). */
export function ratingToken(orderId: string): string {
    return `${orderId}.${signature(orderId)}`
}

export function ratingUrl(orderId: string): string {
    return `${SITE}/noter/${ratingToken(orderId)}`
}

/** Renvoie l'id de commande si le jeton est authentique, sinon null. */
export function verifyRatingToken(token: string): string | null {
    const [orderId, sig] = String(token || '').split('.')
    if (!orderId || !sig || !UUID_RE.test(orderId)) return null
    const expected = Buffer.from(signature(orderId))
    const given = Buffer.from(sig)
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
    return orderId
}
