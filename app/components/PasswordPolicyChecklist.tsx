'use client'

/**
 * Exigences mot de passe affichées avant la validation (aligné Supabase : min. 8 caractères).
 */
export function PasswordPolicyChecklist({
    password,
    className = '',
}: {
    password: string
    className?: string
}) {
    const ok8 = password.length >= 8
    const ok10 = password.length >= 10

    return (
        <ul
            className={`space-y-1 text-[11px] leading-snug ${className}`}
            role="status"
            aria-live="polite"
        >
            <li
                className={
                    ok8
                        ? 'text-green-400 dark:text-green-400 font-medium'
                        : 'text-slate-500 dark:text-slate-400'
                }
            >
                {ok8 ? '✓ ' : '○ '}Au moins 8 caractères (obligatoire)
            </li>
            <li
                className={
                    ok10
                        ? 'text-green-400 dark:text-green-400 font-medium'
                        : 'text-slate-500 dark:text-slate-400'
                }
            >
                {ok10 ? '✓ ' : '○ '}10 caractères ou plus (recommandé pour plus de sécurité)
            </li>
        </ul>
    )
}
