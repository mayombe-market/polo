/**
 * Utilitaire d'export CSV — Mayombe Market
 * UTF-8 avec BOM pour compatibilité Excel (accents français)
 */

type CSVColumn<T> = {
    header: string
    accessor: (row: T) => string | number
}

export function exportCSV<T>(
    data: T[],
    columns: CSVColumn<T>[],
    filename: string
) {
    if (data.length === 0) return

    // BOM UTF-8 pour Excel
    const BOM = '\uFEFF'

    // Header row
    const headers = columns.map(c => escapeCSV(c.header)).join(';')

    // Data rows
    const rows = data.map(row =>
        columns.map(c => escapeCSV(String(c.accessor(row) ?? ''))).join(';')
    )

    const csv = BOM + [headers, ...rows].join('\n')

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

function escapeCSV(value: string): string {
    // Si la valeur contient un séparateur, guillemet ou saut de ligne → on entoure de guillemets
    if (value.includes(';') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
    }
    return value
}

/**
 * Génère un nom de fichier avec la date du jour
 * Ex: "commandes-mayombe-2026-03-13.csv"
 */
export function csvFilename(prefix: string): string {
    const today = new Date().toISOString().slice(0, 10)
    return `${prefix}-mayombe-${today}.csv`
}
