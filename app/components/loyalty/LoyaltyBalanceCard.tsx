'use client'

/**
 * Carte "Ma cagnotte fidélité" pour la page profil.
 * Affiche : balance available + pending + progression vers seuil + CTA.
 */

import Link from 'next/link'
import { formatFcfa } from '@/lib/loyalty/rules'
import type { LoyaltyUiState } from '@/lib/loyalty/types'

type Props = {
    state: LoyaltyUiState
    compact?: boolean
}

export default function LoyaltyBalanceCard({ state, compact = false }: Props) {
    const progressPct = Math.round(state.progressToThreshold * 100)

    return (
        <div className="rounded-2xl border border-orange-200 dark:border-orange-900/40 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-wide text-orange-700 dark:text-orange-400 font-semibold">
                        Ma cagnotte fidélité
                    </p>
                    <p className="mt-1 text-3xl font-extrabold text-slate-900 dark:text-white">
                        {formatFcfa(state.balanceAvailable)}
                    </p>
                    {state.balancePending > 0 && (
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            + {formatFcfa(state.balancePending)} en attente
                        </p>
                    )}
                </div>
                <div className="text-3xl" aria-hidden>
                    🎁
                </div>
            </div>

            {!state.canUse && (
                <div className="mt-4">
                    <div className="h-2 w-full rounded-full bg-orange-100 dark:bg-orange-950/50 overflow-hidden">
                        <div
                            className="h-full bg-orange-500 transition-all"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                    <p className="mt-2 text-xs text-slate-700 dark:text-slate-300">
                        Plus que{' '}
                        <strong>
                            {formatFcfa(
                                Math.max(0, state.thresholdFcfa - state.balanceAvailable)
                            )}
                        </strong>{' '}
                        pour pouvoir utiliser votre cagnotte
                    </p>
                </div>
            )}

            {state.canUse && (
                <p className="mt-3 text-sm text-green-700 dark:text-green-400 font-medium">
                    ✓ Utilisable dès votre prochain achat
                </p>
            )}

            {state.nextExpiration && state.nextExpiration.daysRemaining <= 15 && (
                <p className="mt-3 text-xs text-red-600 dark:text-red-400 font-medium">
                    ⚠ {formatFcfa(state.nextExpiration.amount)} expirent dans{' '}
                    {state.nextExpiration.daysRemaining} jour
                    {state.nextExpiration.daysRemaining > 1 ? 's' : ''}
                </p>
            )}

            {!compact && (
                <div className="mt-4 flex items-center justify-between gap-3">
                    <Link
                        href="/profil/cagnotte"
                        className="text-sm font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                    >
                        Voir le détail →
                    </Link>
                    <div className="text-right">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Gagné au total
                        </p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {formatFcfa(state.lifetime.earned)}
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
