/**
 * Règles métier du programme de fidélité Mayombe Market.
 *
 * ⚠️ Ces constantes sont DUPLIQUÉES dans supabase-loyalty-rpc.sql.
 *    Si tu modifies ici, change AUSSI dans le SQL (sinon incohérence).
 *
 * Toutes les valeurs sont en FCFA entiers.
 */

/** Taux de gain : 10% de la commission Mayombe sur la commande. */
export const LOYALTY_RATE_ON_COMMISSION = 0.10

/** Fenêtre pending → available (en heures). Aligné sur admin_release_funds. */
export const LOYALTY_PENDING_WINDOW_HOURS = 48

/** Durée de validité des points après passage en available (en mois). */
export const LOYALTY_EXPIRATION_MONTHS = 4

/** Seuil minimum (FCFA) pour pouvoir utiliser ses points au checkout. */
export const LOYALTY_USE_THRESHOLD_FCFA = 1000

/** Délai de préavis avant expiration (en jours). */
export const LOYALTY_EXPIRY_NOTICE_DAYS = 15

/** Feature flag global (lu à chaque render). */
export function isLoyaltyEnabled(): boolean {
    return process.env.NEXT_PUBLIC_LOYALTY_ENABLED === '1'
}

/**
 * Calcule les points gagnés sur une commande depuis le montant de commission.
 * @param commissionAmount - orders.commission_amount (FCFA entier)
 * @returns points en FCFA (entier arrondi)
 */
export function computeEarnedPoints(commissionAmount: number): number {
    if (!commissionAmount || commissionAmount <= 0) return 0
    return Math.round(commissionAmount * LOYALTY_RATE_ON_COMMISSION)
}

/**
 * Estime les points qu'un acheteur gagnerait pour un item donné
 * (pour l'affichage "Gagnez X FCFA" sur fiche produit).
 *
 * On ne connaît pas la commission exacte à ce stade (elle dépend du plan vendeur),
 * donc on utilise un taux par défaut de 10% (pire cas pour le vendeur free/starter).
 *
 * @param itemPrice - prix unitaire (FCFA)
 * @param vendorCommissionRate - taux de commission du vendeur (0.04 à 0.10), défaut 0.10
 */
export function estimateEarnOnItem(itemPrice: number, vendorCommissionRate = 0.10): number {
    if (!itemPrice || itemPrice <= 0) return 0
    const commission = itemPrice * vendorCommissionRate
    return Math.round(commission * LOYALTY_RATE_ON_COMMISSION)
}

/** Le client peut-il utiliser ses points ? (seuil atteint) */
export function canUsePoints(balanceAvailable: number): boolean {
    return balanceAvailable >= LOYALTY_USE_THRESHOLD_FCFA
}

/**
 * Montant maximum utilisable sur une commande.
 * Plafonné par la balance ET par le total commande.
 */
export function maxUsableOnOrder(balanceAvailable: number, orderTotal: number): number {
    if (!canUsePoints(balanceAvailable)) return 0
    return Math.max(0, Math.min(balanceAvailable, orderTotal))
}

/** Formate un montant FCFA pour affichage ("1 250 FCFA"). */
export function formatFcfa(amount: number): string {
    if (!Number.isFinite(amount)) return '0 FCFA'
    return `${Math.round(amount).toLocaleString('fr-FR').replace(/\u202f/g, ' ')} FCFA`
}

/**
 * Calcule le nombre de jours restants avant expiration.
 * Retourne null si expiresAt est null.
 */
export function daysUntilExpiration(expiresAt: string | Date | null): number | null {
    if (!expiresAt) return null
    const exp = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
    const ms = exp.getTime() - Date.now()
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}
