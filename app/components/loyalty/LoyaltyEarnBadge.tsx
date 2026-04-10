'use client'

/**
 * Badge "Gagnez X FCFA en cagnotte" pour fiche produit et carte produit.
 *
 * Léger, discret, à afficher à côté du prix.
 */

import { estimateEarnOnItem, formatFcfa, isLoyaltyEnabled } from '@/lib/loyalty/rules'

type Props = {
    price: number
    /** Taux commission du vendeur (facultatif, défaut 10%). */
    vendorCommissionRate?: number
    /** Variante d'affichage. */
    variant?: 'inline' | 'badge'
    className?: string
}

export default function LoyaltyEarnBadge({
    price,
    vendorCommissionRate = 0.10,
    variant = 'inline',
    className = '',
}: Props) {
    if (!isLoyaltyEnabled()) return null

    const earn = estimateEarnOnItem(price, vendorCommissionRate)
    if (earn <= 0) return null

    if (variant === 'badge') {
        return (
            <span
                className={`inline-flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-950/40 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:text-orange-400 ${className}`}
            >
                🎁 +{formatFcfa(earn)}
            </span>
        )
    }

    return (
        <p
            className={`text-xs text-orange-700 dark:text-orange-400 font-medium ${className}`}
        >
            🎁 Gagnez ~{formatFcfa(earn)} en cagnotte
        </p>
    )
}
