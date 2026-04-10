/**
 * Types partagés du programme fidélité.
 * Miroirs des tables loyalty_accounts / loyalty_transactions.
 */

export type LoyaltyTxType =
    | 'earn_pending'
    | 'earn_available'
    | 'spend'
    | 'revoke_pending'
    | 'revoke_available'
    | 'expire'
    | 'admin_adjust'

export type LoyaltyAccount = {
    user_id: string
    balance_pending: number
    balance_available: number
    lifetime_earned: number
    lifetime_spent: number
    lifetime_expired: number
    lifetime_revoked: number
    updated_at: string
}

export type LoyaltyTransaction = {
    id: string
    user_id: string
    order_id: string | null
    type: LoyaltyTxType
    amount: number
    balance_after_pending: number
    balance_after_available: number
    expires_at: string | null
    consumed_at: string | null
    reason: string
    metadata: Record<string, unknown>
    created_by: string | null
    created_at: string
}

/** État "prêt à afficher" pour l'UI (composite balance + infos dérivées) */
export type LoyaltyUiState = {
    balancePending: number
    balanceAvailable: number
    canUse: boolean
    thresholdFcfa: number
    progressToThreshold: number // 0..1
    nextExpiration: {
        amount: number
        expiresAt: string
        daysRemaining: number
    } | null
    lifetime: {
        earned: number
        spent: number
    }
}
