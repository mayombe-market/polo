import { CheckCircle } from 'lucide-react'

interface VerifiedBadgeProps {
    size?: 'sm' | 'md'
}

export default function VerifiedBadge({ size = 'sm' }: VerifiedBadgeProps) {
    const iconSize = size === 'sm' ? 14 : 18
    const textSize = size === 'sm' ? 'text-[9px]' : 'text-[10px]'

    return (
        <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 ${textSize} font-black uppercase`}
            title="Vendeur vérifié"
        >
            <CheckCircle size={iconSize} />
            Vérifié
        </span>
    )
}
