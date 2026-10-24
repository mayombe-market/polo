import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { verifyRatingToken } from '@/lib/orderRatingLink'
import { RATING_CATEGORIES } from '@/lib/ratingCategories'
import { formatOrderNumber } from '@/lib/formatOrderNumber'

/** Statuts où le client a payé / la commande est en cours ou livrée : on peut noter */
const RATEABLE_STATUSES = ['confirmed', 'shipped', 'picked_up', 'delivered']

function svc() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
}

export type RatingContext =
    | { state: 'invalid' }
    | { state: 'not_ready' | 'already_rated' | 'open'; orderNumber: string; shopName: string; firstName: string; products: Array<{ name: string; img: string | null }> }

export async function getRatingContext(token: string): Promise<RatingContext> {
    const orderId = verifyRatingToken(token)
    if (!orderId) return { state: 'invalid' }
    const db = svc()
    const { data: order } = await db
        .from('orders')
        .select('id, order_number, created_at, status, customer_name, items')
        .eq('id', orderId)
        .maybeSingle()
    if (!order) return { state: 'invalid' }

    const items = (order.items || []) as Array<{ name?: string; img?: string; seller_id?: string }>
    const sellerIds = [...new Set(items.map(i => i.seller_id).filter(Boolean))] as string[]
    const { data: sellers } = sellerIds.length
        ? await db.from('profiles').select('shop_name, store_name, full_name').in('id', sellerIds)
        : { data: [] as Array<{ shop_name: string | null; store_name: string | null; full_name: string | null }> }
    const shopName = (sellers || []).map(s => s.shop_name || s.store_name || s.full_name).filter(Boolean).join(' & ') || 'votre vendeur'

    const { data: existing } = await db.from('ratings').select('id').eq('order_id', orderId).maybeSingle()
    const base = {
        orderNumber: formatOrderNumber(order),
        shopName,
        firstName: String(order.customer_name || '').trim().split(/\s+/)[0] || '',
        products: items.slice(0, 4).map(i => ({ name: i.name || 'Article', img: i.img || null })),
    }
    if (existing) return { state: 'already_rated', ...base }
    if (!RATEABLE_STATUSES.includes(order.status)) return { state: 'not_ready', ...base }
    return { state: 'open', ...base }
}

export type RatingInput = {
    vendorRating?: number
    deliveryRating?: number
    platformRating?: number
    vendorTags?: string[]
    deliveryTags?: string[]
    platformTags?: string[]
    comment?: string
}

const allowedTags = (id: string) => RATING_CATEGORIES.find(c => c.id === id)?.tags ?? []
const cleanTags = (id: string, tags?: string[]) => (tags || []).filter(t => (allowedTags(id) as readonly string[]).includes(t)).slice(0, 6)
const validNote = (n?: number) => n === undefined || (Number.isInteger(n) && n >= 1 && n <= 5)

export async function submitRatingWithToken(token: string, input: RatingInput): Promise<{ success: true } | { error: string }> {
    const orderId = verifyRatingToken(token)
    if (!orderId) return { error: 'Lien invalide.' }
    if (![input.vendorRating, input.deliveryRating, input.platformRating].every(validNote)) {
        return { error: 'Les notes doivent être entre 1 et 5.' }
    }
    if (!input.vendorRating && !input.deliveryRating && !input.platformRating) {
        return { error: 'Donnez au moins une note.' }
    }
    const comment = String(input.comment || '').trim()
    if (comment.length > 1000) return { error: 'Commentaire trop long (1000 caractères max).' }

    const db = svc()
    const { data: order } = await db
        .from('orders')
        .select('id, status, user_id, client_confirmed')
        .eq('id', orderId)
        .maybeSingle()
    if (!order) return { error: 'Commande introuvable.' }
    if (!RATEABLE_STATUSES.includes(order.status)) return { error: 'Cette commande n’est pas encore confirmée.' }

    const { error } = await db.from('ratings').insert({
        order_id: orderId,
        user_id: order.user_id,
        vendor_rating: input.vendorRating || null,
        vendor_tags: cleanTags('vendor', input.vendorTags),
        delivery_rating: input.deliveryRating || null,
        delivery_tags: cleanTags('delivery', input.deliveryTags),
        platform_rating: input.platformRating || null,
        platform_tags: cleanTags('platform', input.platformTags),
        comment,
    })
    if (error) {
        if (error.code === '23505') return { error: 'Un avis a déjà été laissé pour cette commande. Merci !' }
        if (error.code === '23502') return { error: 'Les avis sans compte client seront bientôt disponibles. Merci de votre patience !' }
        return { error: 'Impossible d’enregistrer votre avis. Réessayez.' }
    }

    // Noter depuis l'étiquette du colis vaut confirmation de réception
    if (!order.client_confirmed) {
        await db.from('orders')
            .update({ client_confirmed: true, client_confirmed_at: new Date().toISOString() })
            .eq('id', orderId)
    }

    // Même récompense que la notation depuis l'espace client (500 points) pour les clients avec compte
    if (order.user_id) {
        const { data: profile } = await db.from('profiles').select('loyalty_points').eq('id', order.user_id).maybeSingle()
        const current = profile?.loyalty_points || 0
        await db.from('profiles').update({ loyalty_points: current + 500 }).eq('id', order.user_id).eq('loyalty_points', current)
    }
    return { success: true }
}
