/**
 * Configuration centralisée des fonctionnalités de Mayombe Market.
 * Modifier ici pour activer / désactiver un module sans toucher au code métier.
 *
 * RÈGLE : false = désactivé mais conservé dans le code, données intactes.
 */
export const FEATURES = {
    // ── Modules spécialisés (Mission 1) ──────────────────────────────────────
    restaurant: false,
    patisserie: false,
    hotel: false,
    immobilier: false,

    // ── Monétisation (Mission 7) ──────────────────────────────────────────────
    /** Commissions prélevées sur les ventes */
    commissions: false,
    /** Abonnements vendeurs (Starter / Pro / Premium) */
    subscriptions: false,
    /** Campagnes publicitaires payantes vendeurs */
    adCampaigns: true,   // conservées — paiement MTN auto déjà opérationnel

    // ── Paiement (Mission 3) ──────────────────────────────────────────────────
    /** Paiement direct au vendeur (sinon : paiement à Mayombe Market) */
    directVendorPayment: true, // tunnel paiement direct vendeur (migration appliquée en prod)
} as const

export type FeatureFlag = keyof typeof FEATURES

export function isEnabled(flag: FeatureFlag): boolean {
    return FEATURES[flag]
}
