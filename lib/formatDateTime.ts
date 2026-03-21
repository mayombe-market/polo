/**
 * Date + heure pour l’interface admin (fr-FR), ex. « 16 mars 2025 à 14:30 »
 */
const ADMIN_DATETIME_OPTS: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
}

export function formatAdminDateTime(
    input: string | Date | null | undefined,
): string {
    if (input == null || input === '') return '—'
    const d = typeof input === 'string' ? new Date(input) : input
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString('fr-FR', ADMIN_DATETIME_OPTS)
}
