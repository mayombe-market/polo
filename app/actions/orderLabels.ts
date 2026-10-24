'use server'

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { ratingUrl } from '@/lib/orderRatingLink'
import { submitRatingWithToken, type RatingInput } from '@/lib/orderRatingServer'
import { formatOrderNumber } from '@/lib/formatOrderNumber'

export type OrderLabel = {
    orderId: string
    orderNumber: string
    shopName: string
    customerFirstName: string
    ratingUrl: string
}

const LABEL_STATUSES = ['confirmed', 'shipped', 'picked_up', 'delivered']

/** Vendeur connecté : données des étiquettes colis de ses commandes confirmées. */
export async function getMyOrderLabels(orderIds: string[]): Promise<{ labels: OrderLabel[] } | { error: string }> {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Session expirée : reconnectez-vous.' }
    const ids = [...new Set(orderIds)].slice(0, 80)
    if (ids.length === 0) return { labels: [] }

    const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const [{ data: profile }, { data: orders }] = await Promise.all([
        db.from('profiles').select('role, shop_name, store_name, full_name').eq('id', user.id).single(),
        db.from('orders').select('id, order_number, created_at, status, customer_name, items').in('id', ids),
    ])
    if (profile?.role !== 'vendor') return { error: 'Réservé aux vendeurs.' }
    const shopName = profile.shop_name || profile.store_name || profile.full_name || 'Ma boutique'

    const labels = (orders || [])
        .filter(o => LABEL_STATUSES.includes(o.status))
        .filter(o => ((o.items || []) as Array<{ seller_id?: string }>).some(i => i.seller_id === user.id))
        .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
        .map(o => ({
            orderId: o.id,
            orderNumber: formatOrderNumber(o),
            shopName,
            customerFirstName: String(o.customer_name || '').trim().split(/\s+/)[0] || '',
            ratingUrl: ratingUrl(o.id),
        }))
    return { labels }
}

/** Page publique « Noter ma commande » (lien du QR code de l'étiquette). */
export async function submitRatingFromLabel(token: string, input: RatingInput) {
    return submitRatingWithToken(token, input)
}
