'use client'

import { AlertTriangle } from 'lucide-react'
import { INTER_URBAN_PRE_PAYMENT_ALERT } from '@/lib/checkoutSchema'

type Props = {
    open: boolean
    onContinue: () => void
    onCancel: () => void
}

/**
 * Alerte « ville différente » affichée **avant** la modal frais / livraison inter-ville (tunnel panier, fiche produit, checkout).
 */
export default function InterUrbanPrePaymentModal({ open, onContinue, onCancel }: Props) {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/40">
                        <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-300" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Ville différente</h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                            {INTER_URBAN_PRE_PAYMENT_ALERT}
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        onClick={onContinue}
                        className="flex-1 rounded-xl bg-orange-600 px-4 py-3 font-bold text-white shadow-lg hover:bg-orange-700"
                    >
                        Continuer
                    </button>
                </div>
            </div>
        </div>
    )
}
