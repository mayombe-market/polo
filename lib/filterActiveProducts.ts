import { SupabaseClient } from '@supabase/supabase-js'
import { GRACE_PERIOD_DAYS } from './subscription'

/**
 * Récupère les IDs des vendeurs dont l'abonnement est expiré au-delà de la période de grâce.
 * Utilisé pour filtrer les produits sur les pages publiques.
 *
 * Cible : vendeurs avec un plan payant, une date de fin définie,
 * et dont end_date + 3 jours est dans le passé.
 */
export async function getExpiredSellerIds(supabase: SupabaseClient): Promise<string[]> {
    const graceDeadline = new Date(
        Date.now() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
    ).toISOString()

    const { data: expiredSellers } = await supabase
        .from('profiles')
        .select('id')
        .neq('subscription_plan', 'free')
        .not('subscription_plan', 'is', null)
        .not('subscription_end_date', 'is', null)
        .lt('subscription_end_date', graceDeadline)

    return (expiredSellers || []).map(s => s.id)
}

/**
 * Applique le filtre d'exclusion des vendeurs expirés sur une requête Supabase.
 * Ne fait rien si aucun vendeur n'est expiré (évite l'erreur Supabase avec array vide).
 */
export function excludeExpiredSellers(
    query: any,
    expiredIds: string[]
): any {
    if (expiredIds.length === 0) return query
    return query.not('seller_id', 'in', `(${expiredIds.join(',')})`)
}
