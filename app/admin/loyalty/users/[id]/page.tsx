/**
 * Admin — Détail cagnotte d'un utilisateur + formulaire ajustement.
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminUserLoyalty } from '@/app/actions/loyalty'
import { formatFcfa, isLoyaltyEnabled } from '@/lib/loyalty/rules'
import LoyaltyHistoryList from '@/app/components/loyalty/LoyaltyHistoryList'
import AdminAdjustForm from './AdminAdjustForm'

export const dynamic = 'force-dynamic'

export default async function AdminLoyaltyUserPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    if (!isLoyaltyEnabled()) {
        redirect('/admin')
    }

    const { id } = await params
    const { account, history, profile } = await getAdminUserLoyalty(id)

    if (!account && !profile) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-16 text-center">
                <p className="text-sm text-slate-500">
                    Utilisateur introuvable ou accès refusé.
                </p>
                <Link
                    href="/admin/loyalty"
                    className="mt-4 inline-block text-sm font-semibold text-orange-600 hover:underline"
                >
                    ← Retour
                </Link>
            </div>
        )
    }

    const balancePending = account?.balance_pending ?? 0
    const balanceAvailable = account?.balance_available ?? 0

    return (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        🎁 Cagnotte utilisateur
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {profile?.full_name || profile?.email || id}
                    </p>
                </div>
                <Link
                    href="/admin/loyalty"
                    className="text-sm font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                    ← Dashboard
                </Link>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                        Disponible
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-orange-600 dark:text-orange-400 tabular-nums">
                        {formatFcfa(balanceAvailable)}
                    </p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                        En attente
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                        {formatFcfa(balancePending)}
                    </p>
                </div>
            </div>

            {account && (
                <div className="grid grid-cols-4 gap-3">
                    <MiniStat label="Gagné" value={account.lifetime_earned} />
                    <MiniStat label="Dépensé" value={account.lifetime_spent} />
                    <MiniStat label="Expiré" value={account.lifetime_expired} />
                    <MiniStat label="Révoqué" value={account.lifetime_revoked} />
                </div>
            )}

            <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                    Ajustement manuel
                </h2>
                <AdminAdjustForm userId={id} />
            </div>

            <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                    Historique
                </h2>
                <LoyaltyHistoryList history={history} />
            </div>
        </div>
    )
}

function MiniStat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-3 text-center">
            <p className="text-[9px] uppercase text-slate-500 font-semibold">{label}</p>
            <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                {formatFcfa(value)}
            </p>
        </div>
    )
}
