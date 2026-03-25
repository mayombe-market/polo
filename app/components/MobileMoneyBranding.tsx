/**
 * Représentations stylisées MTN Mobile Money & Airtel Money (couleurs de marque reconnaissables).
 * Ne sont pas les fichiers officiels téléchargés — usage graphique sur le site uniquement.
 */
export function MtnMomoLogo({ className = 'h-8 w-auto' }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 120 36"
            role="img"
            aria-label="MTN Mobile Money"
        >
            <title>MTN Mobile Money</title>
            <rect width="120" height="36" rx="6" fill="#FFCB05" />
            <text
                x="60"
                y="24"
                textAnchor="middle"
                fontFamily="system-ui, Arial Black, sans-serif"
                fontSize="16"
                fontWeight="900"
                fill="#000000"
            >
                MTN MoMo
            </text>
        </svg>
    )
}

export function AirtelMoneyLogo({ className = 'h-8 w-auto' }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 132 36"
            role="img"
            aria-label="Airtel Money"
        >
            <title>Airtel Money</title>
            <rect width="132" height="36" rx="6" fill="#ED1C24" />
            <text
                x="66"
                y="24"
                textAnchor="middle"
                fontFamily="system-ui, Arial Black, sans-serif"
                fontSize="13"
                fontWeight="900"
                fill="#FFFFFF"
            >
                Airtel Money
            </text>
        </svg>
    )
}

export function MobileMoneyTrustLine({ className = '' }: { className?: string }) {
    return (
        <p
            className={`text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2 ${className}`}
        >
            <span className="text-green-600 dark:text-green-400" aria-hidden>
                🔒
            </span>
            Paiement sécurisé via Mobile Money
        </p>
    )
}
