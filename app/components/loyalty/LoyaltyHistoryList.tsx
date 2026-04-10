'use client'

/**
 * Liste d'historique des transactions fidélité.
 */

import { formatFcfa } from '@/lib/loyalty/rules'
import type { LoyaltyTransaction, LoyaltyTxType } from '@/lib/loyalty/types'

type Props = {
    history: LoyaltyTransaction[]
}

const TYPE_LABELS: Record<LoyaltyTxType, { label: string; icon: string; color: string }> = {
    earn_pending: {
        label: 'Gain en attente',
        icon: '⏳',
        color: 'text-amber-600 dark:text-amber-400',
    },
    earn_available: {
        label: 'Cagnotte débloquée',
        icon: '✓',
        color: 'text-green-600 dark:text-green-400',
    },
    spend: {
        label: 'Utilisation',
        icon: '🛒',
        color: 'text-blue-600 dark:text-blue-400',
    },
    revoke_pending: {
        label: 'Retour (avant déblocage)',
        icon: '↩',
        color: 'text-slate-500 dark:text-slate-400',
    },
    revoke_available: {
        label: 'Retour',
        icon: '↩',
        color: 'text-slate-500 dark:text-slate-400',
    },
    expire: {
        label: 'Expiration',
        icon: '⏰',
        color: 'text-red-500 dark:text-red-400',
    },
    admin_adjust: {
        label: 'Ajustement',
        icon: '⚙',
        color: 'text-slate-600 dark:text-slate-300',
    },
}

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
    } catch {
        return iso
    }
}

export default function LoyaltyHistoryList({ history }: Props) {
    if (!history || history.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Aucune transaction pour le moment.
                <br />
                Passez une commande pour commencer à cumuler des points !
            </div>
        )
    }

    return (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {history.map((tx) => {
                const meta = TYPE_LABELS[tx.type]
                const sign = tx.amount > 0 ? '+' : tx.amount < 0 ? '' : ''
                return (
                    <li
                        key={tx.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-slate-900/40"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xl" aria-hidden>
                                {meta.icon}
                            </span>
                            <div className="min-w-0">
                                <p className={`text-sm font-semibold ${meta.color}`}>
                                    {meta.label}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {tx.reason}
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                    {formatDate(tx.created_at)}
                                </p>
                            </div>
                        </div>
                        <div
                            className={`shrink-0 text-sm font-bold tabular-nums ${
                                tx.amount > 0
                                    ? 'text-green-600 dark:text-green-400'
                                    : tx.amount < 0
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-slate-500'
                            }`}
                        >
                            {sign}
                            {formatFcfa(Math.abs(tx.amount))}
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}
