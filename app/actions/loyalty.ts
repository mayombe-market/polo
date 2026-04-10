'use server'

/**
 * Server actions du programme de fidélité Mayombe Market.
 *
 * Convention :
 *  - getSupabase() local (comme le reste du repo)
 *  - Les RPCs sensibles (credit/promote/expire/revoke) sont appelées
 *    via service_role OU par cron — jamais depuis ici.
 *  - spend / admin_adjust sont grant execute authenticated,
 *    avec vérifs internes dans le SQL.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import {
    LOYALTY_USE_THRESHOLD_FCFA,
    canUsePoints,
    daysUntilExpiration,
} from '@/lib/loyalty/rules'
import type {
    LoyaltyAccount,
    LoyaltyTransaction,
    LoyaltyUiState,
} from '@/lib/loyalty/types'

async function getSupabase() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                },
            },
        }
    )
}

// =====================================================================
// Lecture : balance + historique + état UI
// =====================================================================

/**
 * Récupère la balance fidélité de l'utilisateur connecté.
 * Retourne null si pas connecté.
 */
export async function getMyLoyaltyAccount(): Promise<LoyaltyAccount | null> {
    try {
        const supabase = await getSupabase()
        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) return null

        const { data, error } = await supabase
            .from('loyalty_accounts')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()

        if (error) {
            console.error('[getMyLoyaltyAccount] error:', error.message)
            return null
        }

        // Pas encore de ligne → renvoyer balance 0 (le trigger profiles la créera
        // mais protège les comptes préexistants)
        if (!data) {
            return {
                user_id: user.id,
                balance_pending: 0,
                balance_available: 0,
                lifetime_earned: 0,
                lifetime_spent: 0,
                lifetime_expired: 0,
                lifetime_revoked: 0,
                updated_at: new Date().toISOString(),
            }
        }

        return data as LoyaltyAccount
    } catch (e) {
        console.error('[getMyLoyaltyAccount] exception:', e)
        return null
    }
}

/**
 * Historique des transactions de l'utilisateur connecté.
 * Retourne les N dernières (défaut 50).
 */
export async function getMyLoyaltyHistory(
    limit = 50
): Promise<LoyaltyTransaction[]> {
    try {
        const supabase = await getSupabase()
        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) return []

        const { data, error } = await supabase
            .from('loyalty_transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) {
            console.error('[getMyLoyaltyHistory] error:', error.message)
            return []
        }

        return (data ?? []) as LoyaltyTransaction[]
    } catch (e) {
        console.error('[getMyLoyaltyHistory] exception:', e)
        return []
    }
}

/**
 * État UI composite : balance + prochaine expiration + progression seuil.
 */
export async function getMyLoyaltyUiState(): Promise<LoyaltyUiState | null> {
    try {
        const supabase = await getSupabase()
        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) return null

        const acc = await getMyLoyaltyAccount()
        if (!acc) return null

        // Prochaine expiration : la ligne earn_available non consommée avec le plus petit expires_at
        const { data: nextExp } = await supabase
            .from('loyalty_transactions')
            .select('amount, expires_at, metadata')
            .eq('user_id', user.id)
            .eq('type', 'earn_available')
            .is('consumed_at', null)
            .not('expires_at', 'is', null)
            .order('expires_at', { ascending: true })
            .limit(1)
            .maybeSingle()

        let nextExpiration: LoyaltyUiState['nextExpiration'] = null
        if (nextExp && nextExp.expires_at) {
            const remainingMeta = (nextExp.metadata as Record<string, unknown> | null)?.[
                'remaining'
            ]
            const remaining =
                typeof remainingMeta === 'number'
                    ? remainingMeta
                    : (nextExp.amount as number)
            const days = daysUntilExpiration(nextExp.expires_at) ?? 0
            nextExpiration = {
                amount: remaining,
                expiresAt: nextExp.expires_at as string,
                daysRemaining: days,
            }
        }

        const progress = Math.min(
            1,
            acc.balance_available / LOYALTY_USE_THRESHOLD_FCFA
        )

        return {
            balancePending: acc.balance_pending,
            balanceAvailable: acc.balance_available,
            canUse: canUsePoints(acc.balance_available),
            thresholdFcfa: LOYALTY_USE_THRESHOLD_FCFA,
            progressToThreshold: progress,
            nextExpiration,
            lifetime: {
                earned: acc.lifetime_earned,
                spent: acc.lifetime_spent,
            },
        }
    } catch (e) {
        console.error('[getMyLoyaltyUiState] exception:', e)
        return null
    }
}

// =====================================================================
// Dépense au checkout (wrapper de la RPC loyalty_spend)
// =====================================================================

export type ApplyPointsResult =
    | { ok: true; applied: number; newTotal: number }
    | { ok: false; error: string }

/**
 * Applique des points sur une commande existante.
 * Appelée depuis le checkout APRÈS createOrder (ou en fin de createOrder).
 *
 * Vérifs faites côté RPC SQL (atomique, idempotente, lock row).
 */
export async function applyPointsToOrder(
    orderId: string,
    amount: number
): Promise<ApplyPointsResult> {
    try {
        if (!orderId || !amount || amount <= 0) {
            return { ok: false, error: 'Paramètres invalides' }
        }

        const supabase = await getSupabase()
        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) return { ok: false, error: 'Non connecté' }

        const { data, error } = await supabase.rpc('loyalty_spend', {
            p_order_id: orderId,
            p_user_id: user.id,
            p_amount: Math.round(amount),
        })

        if (error) {
            console.error('[applyPointsToOrder] rpc error:', error.message)
            // Message user-friendly selon le type d'erreur
            const msg = error.message || ''
            if (msg.includes('threshold')) {
                return {
                    ok: false,
                    error: `Seuil minimum : ${LOYALTY_USE_THRESHOLD_FCFA} FCFA`,
                }
            }
            if (msg.includes('insufficient')) {
                return { ok: false, error: 'Solde fidélité insuffisant' }
            }
            if (msg.includes('already has loyalty points')) {
                return { ok: false, error: 'Points déjà appliqués sur cette commande' }
            }
            if (msg.includes('exceeds order total')) {
                return { ok: false, error: 'Montant supérieur au total commande' }
            }
            return { ok: false, error: 'Erreur lors de l\'application des points' }
        }

        const applied = (data as number) ?? 0

        // Récupérer le nouveau total
        const { data: order } = await supabase
            .from('orders')
            .select('total_amount')
            .eq('id', orderId)
            .maybeSingle()

        revalidatePath('/profil/cagnotte')
        revalidatePath('/checkout')

        return {
            ok: true,
            applied,
            newTotal: (order?.total_amount as number) ?? 0,
        }
    } catch (e) {
        console.error('[applyPointsToOrder] exception:', e)
        return { ok: false, error: 'Erreur serveur' }
    }
}

// =====================================================================
// Ajustement manuel admin
// =====================================================================

export type AdminAdjustResult =
    | { ok: true }
    | { ok: false; error: string }

export async function adminAdjustLoyalty(
    userId: string,
    amount: number, // signé
    reason: string
): Promise<AdminAdjustResult> {
    try {
        if (!userId || !amount || !reason?.trim()) {
            return { ok: false, error: 'Paramètres invalides' }
        }

        const supabase = await getSupabase()
        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) return { ok: false, error: 'Non connecté' }

        // Vérif admin côté serveur (aussi vérifiée en SQL)
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()

        if (profile?.role !== 'admin') {
            return { ok: false, error: 'Réservé aux admins' }
        }

        const { error } = await supabase.rpc('loyalty_admin_adjust', {
            p_user_id: userId,
            p_amount: Math.round(amount),
            p_reason: reason.trim(),
        })

        if (error) {
            console.error('[adminAdjustLoyalty] rpc error:', error.message)
            return { ok: false, error: error.message || 'Erreur RPC' }
        }

        revalidatePath('/admin/loyalty')
        revalidatePath(`/admin/loyalty/users/${userId}`)

        return { ok: true }
    } catch (e) {
        console.error('[adminAdjustLoyalty] exception:', e)
        return { ok: false, error: 'Erreur serveur' }
    }
}

// =====================================================================
// Lectures admin (balances globales + détail par user)
// =====================================================================

export type AdminLoyaltyStats = {
    totalEarned: number
    totalSpent: number
    totalExpired: number
    totalRevoked: number
    totalPending: number
    totalAvailable: number
    usersWithPoints: number
}

export async function getAdminLoyaltyStats(): Promise<AdminLoyaltyStats | null> {
    try {
        const supabase = await getSupabase()
        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) return null

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()
        if (profile?.role !== 'admin') return null

        const { data, error } = await supabase
            .from('loyalty_accounts')
            .select(
                'balance_pending, balance_available, lifetime_earned, lifetime_spent, lifetime_expired, lifetime_revoked'
            )

        if (error) {
            console.error('[getAdminLoyaltyStats] error:', error.message)
            return null
        }

        const rows = data ?? []
        const agg = rows.reduce(
            (acc, r) => {
                acc.totalEarned += r.lifetime_earned ?? 0
                acc.totalSpent += r.lifetime_spent ?? 0
                acc.totalExpired += r.lifetime_expired ?? 0
                acc.totalRevoked += r.lifetime_revoked ?? 0
                acc.totalPending += r.balance_pending ?? 0
                acc.totalAvailable += r.balance_available ?? 0
                if ((r.balance_pending ?? 0) + (r.balance_available ?? 0) > 0) {
                    acc.usersWithPoints += 1
                }
                return acc
            },
            {
                totalEarned: 0,
                totalSpent: 0,
                totalExpired: 0,
                totalRevoked: 0,
                totalPending: 0,
                totalAvailable: 0,
                usersWithPoints: 0,
            }
        )

        return agg
    } catch (e) {
        console.error('[getAdminLoyaltyStats] exception:', e)
        return null
    }
}

export async function getAdminUserLoyalty(userId: string): Promise<{
    account: LoyaltyAccount | null
    history: LoyaltyTransaction[]
    profile: { full_name: string | null; email: string | null } | null
}> {
    try {
        const supabase = await getSupabase()
        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user)
            return { account: null, history: [], profile: null }

        const { data: me } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()
        if (me?.role !== 'admin')
            return { account: null, history: [], profile: null }

        const [accRes, histRes, profRes] = await Promise.all([
            supabase
                .from('loyalty_accounts')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle(),
            supabase
                .from('loyalty_transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(100),
            supabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', userId)
                .maybeSingle(),
        ])

        return {
            account: (accRes.data as LoyaltyAccount | null) ?? null,
            history: (histRes.data as LoyaltyTransaction[] | null) ?? [],
            profile: (profRes.data as { full_name: string | null; email: string | null } | null) ?? null,
        }
    } catch (e) {
        console.error('[getAdminUserLoyalty] exception:', e)
        return { account: null, history: [], profile: null }
    }
}
