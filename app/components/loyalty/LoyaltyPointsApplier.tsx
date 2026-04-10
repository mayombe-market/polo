'use client'

/**
 * Composant d'application des points au checkout.
 *
 * Utilisation :
 *  - passe `balanceAvailable`, `orderTotal`, et un callback `onChange(points)`
 *  - le composant gère l'UI (input, bouton "tout utiliser", validation)
 *  - le parent (checkout) met à jour le total affiché et stocke la valeur
 *    à appliquer au moment de createOrder
 *
 * Note : l'appel RPC réel se fait au moment de createOrder, pas ici.
 *        Ce composant n'appelle aucune server action.
 */

import { useMemo, useState } from 'react'
import {
    LOYALTY_USE_THRESHOLD_FCFA,
    canUsePoints,
    formatFcfa,
    maxUsableOnOrder,
} from '@/lib/loyalty/rules'

type Props = {
    balanceAvailable: number
    orderTotal: number
    onChange: (pointsToUse: number) => void
    disabled?: boolean
    disabledReason?: string
}

export default function LoyaltyPointsApplier({
    balanceAvailable,
    orderTotal,
    onChange,
    disabled = false,
    disabledReason,
}: Props) {
    const [useIt, setUseIt] = useState(false)
    const [inputValue, setInputValue] = useState('')

    const canUse = canUsePoints(balanceAvailable)
    const maxUsable = useMemo(
        () => maxUsableOnOrder(balanceAvailable, orderTotal),
        [balanceAvailable, orderTotal]
    )

    function handleChange(next: number) {
        const clamped = Math.max(0, Math.min(Math.round(next), maxUsable))
        setInputValue(String(clamped))
        onChange(clamped)
    }

    function handleToggle(next: boolean) {
        setUseIt(next)
        if (!next) {
            setInputValue('')
            onChange(0)
        } else {
            // Par défaut, propose d'utiliser le maximum
            setInputValue(String(maxUsable))
            onChange(maxUsable)
        }
    }

    // Balance 0 → ne rien afficher du tout
    if (balanceAvailable <= 0) return null

    // Sous le seuil → juste un message informatif
    if (!canUse) {
        return (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-semibold">
                        {formatFcfa(balanceAvailable)}
                    </span>{' '}
                    en cagnotte
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Minimum {formatFcfa(LOYALTY_USE_THRESHOLD_FCFA)} pour utiliser votre cagnotte.
                </p>
            </div>
        )
    }

    // Seuil atteint mais disabled (ex: code promo actif)
    if (disabled) {
        return (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                    Cagnotte : <span className="font-semibold">{formatFcfa(balanceAvailable)}</span>
                </p>
                {disabledReason && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {disabledReason}
                    </p>
                )}
            </div>
        )
    }

    return (
        <div className="rounded-xl border border-orange-200 dark:border-orange-900/40 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/10 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-orange-500"
                    checked={useIt}
                    onChange={(e) => handleToggle(e.target.checked)}
                />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        Utiliser ma cagnotte fidélité
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                        Disponible :{' '}
                        <span className="font-semibold text-orange-700 dark:text-orange-400">
                            {formatFcfa(balanceAvailable)}
                        </span>
                    </p>
                </div>
            </label>

            {useIt && (
                <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={maxUsable}
                            step={100}
                            value={inputValue}
                            onChange={(e) => handleChange(Number(e.target.value))}
                            className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="0"
                        />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            FCFA
                        </span>
                        <button
                            type="button"
                            onClick={() => handleChange(maxUsable)}
                            className="rounded-lg border border-orange-300 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-950/40"
                        >
                            Max
                        </button>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Vous pouvez utiliser jusqu'à {formatFcfa(maxUsable)} sur cette commande.
                    </p>
                </div>
            )}
        </div>
    )
}
