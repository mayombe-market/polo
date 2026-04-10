'use client'

/**
 * Modal explicative "Comment fonctionne la cagnotte fidélité ?"
 * Ouvert depuis la page profil / cagnotte.
 */

import { useState } from 'react'
import {
    LOYALTY_EXPIRATION_MONTHS,
    LOYALTY_PENDING_WINDOW_HOURS,
    LOYALTY_USE_THRESHOLD_FCFA,
    formatFcfa,
} from '@/lib/loyalty/rules'

export default function LoyaltyHowItWorksModal() {
    const [open, setOpen] = useState(false)

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
            >
                Comment ça marche ?
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 p-4"
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                                🎁 Ma cagnotte fidélité
                            </h2>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none"
                                aria-label="Fermer"
                            >
                                ×
                            </button>
                        </div>

                        <div className="mt-4 space-y-4 text-sm text-slate-700 dark:text-slate-300">
                            <div>
                                <p className="font-semibold text-slate-900 dark:text-white">
                                    Comment je gagne des points ?
                                </p>
                                <p className="mt-1">
                                    À chaque commande livrée, vous gagnez automatiquement
                                    une petite somme en cagnotte. C'est offert par Mayombe Market, pas besoin d'action
                                    de votre part.
                                </p>
                            </div>

                            <div>
                                <p className="font-semibold text-slate-900 dark:text-white">
                                    Quand ma cagnotte est-elle utilisable ?
                                </p>
                                <p className="mt-1">
                                    Les points sont en attente pendant{' '}
                                    {LOYALTY_PENDING_WINDOW_HOURS} heures après la livraison,
                                    puis deviennent utilisables. Vous devez avoir au moins{' '}
                                    <strong>{formatFcfa(LOYALTY_USE_THRESHOLD_FCFA)}</strong> en
                                    cagnotte disponible pour l'utiliser.
                                </p>
                            </div>

                            <div>
                                <p className="font-semibold text-slate-900 dark:text-white">
                                    Comment je l'utilise ?
                                </p>
                                <p className="mt-1">
                                    Au moment de valider votre commande, cochez
                                    "Utiliser ma cagnotte" et choisissez combien vous voulez
                                    utiliser. La réduction est immédiate.
                                </p>
                            </div>

                            <div>
                                <p className="font-semibold text-slate-900 dark:text-white">
                                    Est-ce que ça expire ?
                                </p>
                                <p className="mt-1">
                                    Oui, les points sont valables{' '}
                                    <strong>{LOYALTY_EXPIRATION_MONTHS} mois</strong> à partir du
                                    moment où ils deviennent utilisables. Vous recevrez une
                                    alerte 15 jours avant expiration.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="mt-6 w-full rounded-xl bg-orange-500 hover:bg-orange-600 py-3 text-sm font-semibold text-white"
                        >
                            J'ai compris
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
