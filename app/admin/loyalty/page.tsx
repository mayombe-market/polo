/**
 * Admin — Dashboard programme fidélité
 * Accès : /admin/loyalty
 * Stats globales + lien vers recherche utilisateur.
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminLoyaltyStats } from '@/app/actions/loyalty'
import { formatFcfa, isLoyaltyEnabled } from '@/lib/loyalty/rules'

export const dynamic = 'force-dynamic'

export default async function AdminLoyaltyPage() {
    if (!isLoyaltyEnabled()) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-16 text-center">
                <p className="text-sm text-slate-500">
                    Programme fidélité désactivé (NEXT_PUBLIC_LOYALTY_ENABLED).
                </p>
            </div>
        )
    }

    const stats = await getAdminLoyaltyStats()
    if (!stats) {
        redirect('/admin')
    }

    const inCirculation = stats.totalPending + stats.totalAvailable

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        🎁 Programme fidélité
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Vue d'ensemble des points distribués
                    </p>
                </div>
                <Link
                    href="/admin"
                    className="text-sm font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                    ← Admin
                </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Distribué (lifetime)" value={formatFcfa(stats.totalEarned)} color="text-green-600 dark:text-green-400" />
                <StatCard label="Utilisé (lifetime)" value={formatFcfa(stats.totalSpent)} color="text-blue-600 dark:text-blue-400" />
                <StatCard label="Expiré" value={formatFcfa(stats.totalExpired)} color="text-red-500 dark:text-red-400" />
                <StatCard label="Retours (révoqué)" value={formatFcfa(stats.totalRevoked)} color="text-slate-500" />
                <StatCard label="En attente (pending)" value={formatFcfa(stats.totalPending)} color="text-amber-600 dark:text-amber-400" />
                <StatCard label="Disponible (available)" value={formatFcfa(stats.totalAvailable)} color="text-orange-600 dark:text-orange-400" />
                <StatCard label="En circulation" value={formatFcfa(inCirculation)} color="text-slate-900 dark:text-white" />
                <StatCard label="Clients avec solde" value={String(stats.usersWithPoints)} color="text-slate-900 dark:text-white" />
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                    Gestion par utilisateur
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Pour ajuster manuellement la cagnotte d'un client, utilise son identifiant utilisateur (UUID).
                </p>
                <form action="/admin/loyalty/users" method="get" className="flex gap-2">
                    <input
                        name="id"
                        type="text"
                        placeholder="UUID utilisateur"
                        className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                    />
                    <button
                        type="submit"
                        className="rounded-lg bg-orange-500 hover:bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                        Rechercher
                    </button>
                </form>
            </div>

            <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 p-4">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase">
                    Règles actuelles
                </p>
                <ul className="mt-2 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                    <li>• Gain : 10% de la commission Mayombe, après livraison</li>
                    <li>• Fenêtre pending : 48h</li>
                    <li>• Seuil d'utilisation : 1 000 FCFA</li>
                    <li>• Expiration : 4 mois</li>
                    <li>• Payeur : Mayombe Market</li>
                </ul>
            </div>
        </div>
    )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">
                {label}
            </p>
            <p className={`mt-1 text-xl font-extrabold tabular-nums ${color}`}>
                {value}
            </p>
        </div>
    )
}
