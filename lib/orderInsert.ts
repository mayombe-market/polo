/**
 * Colonnes de suivi (anti-doublon, attribution marketing) absentes de la base de production
 * tant que supabase-hotfix-orders-columns.sql n'est pas appliqué. Sans elles, l'insertion
 * échoue (PGRST204) et plus aucune commande n'est enregistrée.
 */
export const OPTIONAL_ORDER_COLUMNS = [
    'idempotency_key',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'attribution_session_id',
] as const

type PgError = { code?: string; message?: string } | null

export function isMissingOptionalOrderColumn(error: PgError): boolean {
    const match = /Could not find the '([^']+)' column of 'orders'/.exec(error?.message || '')
    return !!match && (OPTIONAL_ORDER_COLUMNS as readonly string[]).includes(match[1])
}

/** Insère la commande ; si une colonne de suivi manque en base, réessaie une fois sans ces colonnes. */
export async function insertOrderRow<R extends { error: PgError }>(
    run: (row: Record<string, unknown>) => PromiseLike<R>,
    row: Record<string, unknown>,
): Promise<R> {
    const first = await run(row)
    if (!isMissingOptionalOrderColumn(first.error)) return first

    console.error('[insertOrderRow] colonnes de suivi absentes en base — commande enregistrée sans elles :', first.error?.message)
    const stripped = { ...row }
    for (const col of OPTIONAL_ORDER_COLUMNS) delete stripped[col]
    return run(stripped)
}
