'use client'

import { AlertTriangle } from 'lucide-react'
import { DELIVERY_FEE_INTER_URBAN } from '@/lib/checkoutSchema'

type Props = {
    open: boolean
    buyerCity: string
    sellerCity: string
    onAccept: () => void
    onCancel: () => void
}

export default function InterUrbanWarningModal({
    open,
    buyerCity,
    sellerCity,
    onAccept,
    onCancel,
}: Props) {
    if (!open) return null
    const feeLabel = `${DELIVERY_FEE_INTER_URBAN.toLocaleString('fr-FR')} FCFA`
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                        <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-300" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Livraison inter-ville</h2>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            Ton point de retrait est à <strong>{buyerCity}</strong> mais ce produit est expédié depuis{' '}
                            <strong>{sellerCity || '—'}</strong>.
                        </p>
                    </div>
                </div>

                <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm dark:bg-amber-900/20">
                    <p className="font-semibold text-amber-900 dark:text-amber-100">Frais de livraison inter-ville</p>
                    <p className="mt-1 text-amber-800 dark:text-amber-200">
                        <strong>{feeLabel}</strong> (au lieu de 1 000–2 000 FCFA en intra-ville)
                    </p>
                    <p className="mt-1 text-amber-800 dark:text-amber-200">
                        Délai estimé : <strong>24h à 96h</strong>
                    </p>
                </div>

                <div className="mt-5 flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        onClick={onAccept}
                        className="flex-1 rounded-xl bg-orange-600 px-4 py-3 font-bold text-white shadow-lg hover:bg-orange-700"
                    >
                        J&apos;accepte, continuer
                    </button>
                </div>
            </div>
        </div>
    )
}
