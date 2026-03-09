// ═══════════════════════════════════════════════════════
// Utilitaires d'abonnement vendeur — Mayombe Market
// Partagé entre serveur (server actions) et client (dashboard)
// ═══════════════════════════════════════════════════════

export type SubscriptionStatus = 'active' | 'grace' | 'expired' | 'free' | 'legacy'

/** Nombre de jours de grâce après expiration avant de masquer les produits */
export const GRACE_PERIOD_DAYS = 3

/**
 * Détermine le statut d'abonnement d'un vendeur.
 * - free : plan gratuit ou non défini
 * - legacy : plan payant sans date de fin (vendeurs existants avant cette feature)
 * - active : abonnement en cours (now ≤ end_date)
 * - grace : expiré mais dans la période de grâce (end_date < now ≤ end_date + 3j)
 * - expired : expiré au-delà de la grâce (now > end_date + 3j)
 */
export function getSubscriptionStatus(profile: {
    subscription_plan?: string | null
    subscription_end_date?: string | null
}): SubscriptionStatus {
    const plan = profile?.subscription_plan || 'free'

    // Plan gratuit = toujours actif (limité par nombre de produits, pas par le temps)
    if (plan === 'free' || !plan) return 'free'

    // Plan payant sans date de fin = vendeur legacy (migré avant cette feature)
    if (!profile.subscription_end_date) return 'legacy'

    const endDate = new Date(profile.subscription_end_date)
    const now = new Date()
    const graceEnd = new Date(endDate.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)

    if (now <= endDate) return 'active'
    if (now <= graceEnd) return 'grace'
    return 'expired'
}

/**
 * Nombre de jours restants avant expiration.
 * Retourne -1 si pas de date (legacy ou free).
 * Peut être négatif si déjà expiré.
 */
export function getDaysRemaining(subscriptionEndDate: string | null | undefined): number {
    if (!subscriptionEndDate) return -1
    const end = new Date(subscriptionEndDate)
    const now = new Date()
    const diff = end.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Calcule la nouvelle date de fin lors d'un renouvellement.
 * - Si l'abonnement est encore actif → extend depuis la date de fin actuelle
 * - Si expiré ou pas de date → commence depuis maintenant
 */
export function computeNewEndDate(
    currentEndDate: string | null | undefined,
    billing: 'monthly' | 'yearly'
): string {
    const daysToAdd = billing === 'monthly' ? 30 : 365
    const msToAdd = daysToAdd * 24 * 60 * 60 * 1000
    const now = new Date()

    // Si l'abonnement est encore actif, on prolonge depuis la fin actuelle
    if (currentEndDate) {
        const currentEnd = new Date(currentEndDate)
        if (currentEnd > now) {
            return new Date(currentEnd.getTime() + msToAdd).toISOString()
        }
    }

    // Sinon, on part d'aujourd'hui
    return new Date(now.getTime() + msToAdd).toISOString()
}

/**
 * Vérifie si l'abonnement est expiré au-delà de la période de grâce.
 * Utilisé pour masquer les produits et bloquer l'ajout.
 */
export function isSubscriptionExpiredPastGrace(profile: {
    subscription_plan?: string | null
    subscription_end_date?: string | null
}): boolean {
    return getSubscriptionStatus(profile) === 'expired'
}
