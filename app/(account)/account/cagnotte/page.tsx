/**
 * Page "Ma cagnotte fidélité"
 * Accessible via /account/cagnotte
 *
 * Server component : lecture synchrone via server actions.
 * Si feature flag désactivé → message "bientôt disponible".
 */

import Link from 'next/link'
import LoyaltyBalanceCard from '@/app/components/loyalty/LoyaltyBalanceCard'
import LoyaltyHistoryList from '@/app/components/loyalty/LoyaltyHistoryList'
import LoyaltyHowItWorksModal from '@/app/components/loyalty/LoyaltyHowItWorksModal'
import {
    getMyLoyaltyHistory,
    getMyLoyaltyUiState,
} from '@/app/actions/loyalty'
import { isLoyaltyEnabled, formatFcfa } from '@/lib/loyalty/rules'

export const dynamic = 'force-dynamic'

export default async function CagnottePage() {
    if (!isLoyaltyEnabled()) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-16 text-center">
                <div className="text-5xl mb-4">🎁</div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    Programme fidélité
                </h1>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                    Bientôt disponible.
                </p>
                <Link
                    href="/account"
                    className="mt-6 inline-block text-sm font-semibold text-orange-600 hover:underline"
                >
                    ← Retour au compte
                </Link>
            </div>
        )
    }

    const [state, history] = await Promise.all([
        getMyLoyaltyUiState(),
        getMyLoyaltyHistory(50),
    ])

    if (!state) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-16 text-center">
                <p className="text-sm text-slate-500">Veuillez vous connecter.</p>
                <Link
                    href="/signin"
                    className="mt-4 inline-block rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
                >
                    Se connecter
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    Ma cagnotte
                </h1>
                <LoyaltyHowItWorksModal />
            </div>

            <LoyaltyBalanceCard state={state} />

            {/* Stats lifetime */}
            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Total gagné
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                        {formatFcfa(state.lifetime.earned)}
                    </p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Total utilisé
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                        {formatFcfa(state.lifetime.spent)}
                    </p>
                </div>
            </div>

            {/* Historique */}
            <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                    Historique
                </h2>
                <LoyaltyHistoryList history={history} />
            </div>

            <div className="pt-4 text-center">
                <Link
                    href="/account"
                    className="text-sm font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                    ← Retour au compte
                </Link>
            </div>
        </div>
    )
}
