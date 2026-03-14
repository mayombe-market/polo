/**
 * Échappe les caractères spéciaux PostgREST dans les inputs utilisateur
 * pour éviter l'injection dans les filtres .or() et les wildcards SQL.
 * Caractères échappés : \ , . ( ) % _
 */
export function sanitizePostgrestValue(input: string): string {
    return input
        .replace(/\\/g, '\\\\')
        .replace(/,/g, '\\,')
        .replace(/\./g, '\\.')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_')
}
