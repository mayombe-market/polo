'use server'

import { createClient } from '@supabase/supabase-js'
import { summarizeResponsiveness, type ResponsivenessSummary } from '@/lib/vendorResponsiveness'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Résumé public (aucune donnée de commande) : nombre de réponses et délai médian sur 90 jours. */
export async function getVendorResponsiveness(sellerId: string): Promise<ResponsivenessSummary> {
    if (!UUID_RE.test(sellerId)) return { answered: 0, medianMinutes: null }
    const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const since = new Date(Date.now() - 90 * 24 * 3600_000).toISOString()
    const { data } = await db
        .from('orders')
        .select('created_at, payment_method, status, order_type, cod_accepted_at, vendor_payments, items')
        .neq('order_type', 'subscription')
        .gte('created_at', since)
        .filter('items', 'cs', JSON.stringify([{ seller_id: sellerId }]))
        .limit(300)
    return summarizeResponsiveness(data || [], sellerId)
}
