/**
 * Utilitaires Supabase — timeouts, résilience réseau et validation des réponses.
 *
 * Objectifs de cette version :
 * - **Erreurs explicites** : classes d’erreur dédiées, statuts pour `safeGetUser`, logs `warn` / `error` avec préfixe (pas de warn pour visiteur sans session).
 * - **Retries (≥ 3 relances)** : au moins **4 tentatives** au total via `withRetry` (`./supabase-browser`),
 *   là où une **nouvelle** promesse peut être créée à chaque essai (`safeGetUser` sur erreurs transitoires, `withQueryTimeoutRetry`).
 * - **Données valides** : helpers optionnels pour n’utiliser `data` que lorsque `error` est absent et que la charge est définie.
 *
 * Limite connue : `withTimeout(fixedPromise)` ne peut pas « rejouer » la même promesse ; pour timeout + retry,
 * utiliser **`withQueryTimeoutRetry(() => votreRequête(), …)`** qui rappelle le factory à chaque tentative.
 */

import { withRetry, SUPABASE_FETCH_MIN_TOTAL_ATTEMPTS } from './supabase-browser'
import { NETWORK_TIMEOUT_MS } from './networkTimeouts'

// ─── Constantes & logging ───────────────────────────────────────────────────

const MODULE_TAG = '[supabase-utils]'

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function logWarn(context: string, message: string, detail?: unknown): void {
    if (detail !== undefined) {
        console.warn(`${MODULE_TAG} [${context}] ${message}`, detail)
    } else {
        console.warn(`${MODULE_TAG} [${context}] ${message}`)
    }
}

function logError(context: string, message: string, detail?: unknown): void {
    if (detail !== undefined) {
        console.error(`${MODULE_TAG} [${context}] ${message}`, detail)
    } else {
        console.error(`${MODULE_TAG} [${context}] ${message}`)
    }
}

// ─── Erreurs typées ───────────────────────────────────────────────────────────

/** Levée lorsque `withTimeout` / `withQueryTimeoutRetry` dépassent le délai imparti. */
export class SupabaseQueryTimeoutError extends Error {
    readonly timeoutMs: number
    readonly name = 'SupabaseQueryTimeoutError'

    constructor(timeoutMs: number) {
        super(`Requête Supabase : délai dépassé (${timeoutMs} ms)`)
        this.timeoutMs = timeoutMs
    }
}

/** Erreur interne pour la course contre le timeout dans `safeGetUser`. */
class AuthGetSessionTimeoutError extends Error {
    readonly name = 'AuthGetSessionTimeoutError'
    constructor(timeoutMs: number) {
        super(`safeGetUser: délai dépassé (${timeoutMs} ms)`)
    }
}

// ─── safeGetUser ─────────────────────────────────────────────────────────────

export type SafeGetUserStatus = 'ok' | 'no-user' | 'timeout' | 'network-error' | 'unknown-error'

export interface SafeGetUserResult<UserType = any> {
    /** Utilisateur courant uniquement si `status === 'ok'`. Sinon `null` (jamais `undefined` ici). */
    user: UserType | null
    status: SafeGetUserStatus
    error?: Error
}

/** Réponse typique de `supabase.auth.getSession()` : lire `data.session` et `error`. */
interface AuthGetSessionPayload {
    data?: { session?: { user?: unknown } | null }
    error?: { message?: string; status?: number; name?: string }
}

/**
 * Visiteur sans session : pas de log (évite spam AuthSessionMissingError sur mobile).
 * Aligné sur @supabase/auth-js : `__isAuthError` + `name`, plus repli textuel si le bundle altère les champs.
 */
function benignNoSessionAuthError(error: unknown): boolean {
    if (error == null) return false

    if (typeof error === 'object') {
        const o = error as { __isAuthError?: boolean; name?: string; message?: string }
        if (o.__isAuthError === true && o.name === 'AuthSessionMissingError') {
            return true
        }
    }

    const parts = [
        typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : '',
        typeof error === 'object' && error !== null && 'name' in error
            ? String((error as { name: unknown }).name)
            : '',
        error instanceof Error ? error.message : '',
        error instanceof Error ? error.name : '',
        String(error),
    ]
    const blob = parts.join(' ').toLowerCase()

    return (
        blob.includes('authsessionmissing')
        || blob.includes('auth session missing')
        || blob.includes('invalid refresh token')
        || blob.includes('refresh token not found')
    )
}

function isTransientAuthFailure(error: { message?: string; status?: number }): boolean {
    const m = (error.message || '').toLowerCase()
    if (typeof error.status === 'number' && error.status >= 500) {
        return true
    }
    return (
        m.includes('network')
        || m.includes('fetch')
        || m.includes('timeout')
        || m.includes('econnreset')
        || m.includes('etimedout')
        || m.includes('failed to fetch')
    )
}

function classifyAuthSdkError(error: { message?: string; status?: number }): SafeGetUserStatus {
    const m = (error.message || '').toLowerCase()
    if (m.includes('network') || m.includes('fetch')) {
        return 'network-error'
    }
    return 'unknown-error'
}

/**
 * 1) **Fast path** : `getSession()` seul (sans timeout ni retry). Pas de session → `no-user` immédiat
 *    (pas d’appel `getUser`, pas de spam `AuthSessionMissingError` sur pages publiques).
 * 2) **Repli** : `getUser()` avec course timeout + retries pour erreurs transitoires uniquement.
 */
/** Délai par défaut plus tolérant (réseaux lents, CDN) — surchargeable via NEXT_PUBLIC_SUPABASE_GETUSER_TIMEOUT_MS (ex. 15000). */
function defaultSafeGetUserTimeoutMs(): number {
    if (typeof process === 'undefined' || !process.env) return 10000
    const n = Number(process.env.NEXT_PUBLIC_SUPABASE_GETUSER_TIMEOUT_MS)
    if (Number.isFinite(n) && n >= 4000 && n <= 60000) return Math.floor(n)
    return 10000
}

/** Réponse typique de `supabase.auth.getUser()`. */
interface AuthGetUserPayload {
    data?: { user?: unknown }
    error?: { message?: string; status?: number; name?: string }
}

function consumeGetUserPayload<UserType>(
    result: AuthGetUserPayload | undefined,
    context: string,
): SafeGetUserResult<UserType> | 'transient-retry' {
    if (result?.error) {
        const errObj = result.error
        if (benignNoSessionAuthError(errObj)) {
            return { user: null, status: 'no-user' }
        }
        if (isTransientAuthFailure(errObj)) {
            return 'transient-retry'
        }
        logError(context, 'Erreur auth non récupérable (getUser).', errObj)
        return {
            user: null,
            status: classifyAuthSdkError(errObj),
            error: new Error(errObj.message || 'Auth error'),
        }
    }

    const user = (result?.data?.user ?? null) as UserType | null
    if (user == null) {
        return { user: null, status: 'no-user' }
    }

    return { user, status: 'ok' }
}

export async function safeGetUser<UserType = any>(
    supabase: { auth: { getSession: () => Promise<unknown>; getUser: () => Promise<unknown> } },
    timeoutMs = defaultSafeGetUserTimeoutMs(),
): Promise<SafeGetUserResult<UserType>> {
    const context = 'safeGetUser'
    const maxAttempts = SUPABASE_FETCH_MIN_TOTAL_ATTEMPTS

    // Fast path : pas de session → pas de getUser, pas de retry (comportement normal visiteur)
    try {
        const rawSession = await supabase.auth.getSession()
        const sessionPayload = rawSession as AuthGetSessionPayload

        if (sessionPayload?.error) {
            if (benignNoSessionAuthError(sessionPayload.error)) {
                return { user: null, status: 'no-user' }
            }
        } else {
            const session = sessionPayload?.data?.session ?? null
            if (!session) {
                return { user: null, status: 'no-user' }
            }
            const user = (session.user ?? null) as UserType | null
            if (!user) {
                return { user: null, status: 'no-user' }
            }
            return { user, status: 'ok' }
        }
    } catch {
        // getSession a levé : repli getUser + timeouts
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const raw = await Promise.race([
                supabase.auth.getUser(),
                new Promise<never>((_, reject) => {
                    setTimeout(() => reject(new AuthGetSessionTimeoutError(timeoutMs)), timeoutMs)
                }),
            ])
            const out = consumeGetUserPayload<UserType>(raw as AuthGetUserPayload, context)

            if (out === 'transient-retry') {
                if (attempt < maxAttempts) {
                    logWarn(
                        context,
                        `Tentative ${attempt}/${maxAttempts} — erreur auth récupérable (getUser), nouvel essai après backoff.`,
                    )
                    await sleep(400 * attempt)
                    continue
                }
                logError(context, 'Erreur auth transitoire (getUser) : tentatives épuisées.')
                return {
                    user: null,
                    status: 'network-error',
                    error: new Error('safeGetUser: transient auth failure'),
                }
            }

            return out
        } catch (err: unknown) {
            if (err instanceof AuthGetSessionTimeoutError) {
                if (attempt < maxAttempts) {
                    logWarn(context, `Timeout ${timeoutMs} ms — tentative ${attempt}/${maxAttempts}, nouvel essai (getUser).`)
                    await sleep(400 * attempt)
                    continue
                }
                logError(context, `Timeout après ${maxAttempts} tentatives (getUser).`, err)
                return {
                    user: null,
                    status: 'timeout',
                    error: err instanceof Error ? err : new Error(String(err)),
                }
            }

            if (benignNoSessionAuthError(err)) {
                return { user: null, status: 'no-user' }
            }

            const message = err instanceof Error ? err.message : String(err)
            const lower = message.toLowerCase()
            const looksNetwork = lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')

            if (looksNetwork && attempt < maxAttempts) {
                logWarn(context, `Erreur réseau (getUser) — tentative ${attempt}/${maxAttempts}.`, err)
                await sleep(400 * attempt)
                continue
            }

            logError(context, 'Erreur inattendue lors de getUser.', err)
            return {
                user: null,
                status: looksNetwork ? 'network-error' : 'unknown-error',
                error: err instanceof Error ? err : new Error(message),
            }
        }
    }

    logError(context, 'Boucle de retry getUser terminée sans succès (ne devrait pas arriver).')
    return { user: null, status: 'unknown-error', error: new Error('safeGetUser: exhausted attempts') }
}

// ─── withTimeout (API existante — une seule tentative) ───────────────────────

/**
 * Exécute une promesse (souvent un builder PostgREST) avec un plafond de temps.
 *
 * **Important :** la promesse est créée **une fois** par l’appelant. En cas de timeout, une nouvelle requête
 * nécessite un **nouvel** appel à `withTimeout(nouvellePromesse)`. Pour timeout **+** retries automatiques,
 * préférer {@link withQueryTimeoutRetry}.
 *
 * @param queryPromise - Thenable Supabase (ou toute promesse)
 * @param timeoutMs - Délai max (défaut {@link NETWORK_TIMEOUT_MS})
 * @param label - Libellé pour les logs (défaut `withTimeout`)
 */
export async function withTimeout<T = unknown>(
    queryPromise: PromiseLike<T>,
    timeoutMs = NETWORK_TIMEOUT_MS,
    label = 'withTimeout',
): Promise<T> {
    try {
        return await Promise.race([
            Promise.resolve(queryPromise),
            new Promise<never>((_, reject) => {
                setTimeout(() => reject(new SupabaseQueryTimeoutError(timeoutMs)), timeoutMs)
            }),
        ])
    } catch (err) {
        if (err instanceof SupabaseQueryTimeoutError) {
            logError(label, err.message)
        } else {
            logError(label, 'Promesse rejetée.', err)
        }
        throw err
    }
}

// ─── Timeout + retries (factory) ─────────────────────────────────────────────

export interface WithQueryTimeoutRetryOptions {
    /** Préfixe des logs / messages `withRetry` */
    label?: string
    /** ≥ 4 par défaut (1 essai + 3 relances minimum, aligné sur `SUPABASE_FETCH_MIN_TOTAL_ATTEMPTS`) */
    maxAttempts?: number
}

/**
 * À chaque tentative, appelle `execute()` **à nouveau** puis applique `withTimeout` : compatible retries réels.
 * Combine {@link withRetry} + {@link withTimeout}.
 */
export async function withQueryTimeoutRetry<T = unknown>(
    execute: () => PromiseLike<T>,
    timeoutMs = NETWORK_TIMEOUT_MS,
    options?: WithQueryTimeoutRetryOptions,
): Promise<T> {
    const label = options?.label ?? 'withQueryTimeoutRetry'
    const maxAttempts = Math.max(SUPABASE_FETCH_MIN_TOTAL_ATTEMPTS, options?.maxAttempts ?? SUPABASE_FETCH_MIN_TOTAL_ATTEMPTS)

    return withRetry(async () => withTimeout(execute(), timeoutMs, label), {
        label,
        maxAttempts,
    })
}

// ─── Validation des réponses PostgREST ───────────────────────────────────────

/** Forme minimale des réponses `.select()` / `.single()` / `.maybeSingle()`. */
export type PostgrestLikeResult<T> = {
    data: T | null
    error: { message?: string; code?: string; details?: string; hint?: string } | null
}

/**
 * Extrait `data` **uniquement** si `error` est absent et `data` n’est pas `null` ni `undefined`.
 * Sinon retourne un objet discriminant — **ne lance pas**.
 */
export function getValidPostgrestData<T>(
    result: PostgrestLikeResult<T>,
    label: string,
): { valid: true; data: T } | { valid: false; reason: string } {
    if (result.error) {
        const msg = result.error.message || 'Erreur PostgREST'
        logError(label, msg, result.error)
        return { valid: false, reason: msg }
    }
    if (result.data === null || result.data === undefined) {
        logWarn(label, 'Réponse sans erreur mais `data` est null ou undefined — considéré comme invalide pour usage strict.')
        return { valid: false, reason: 'empty data' }
    }
    return { valid: true, data: result.data }
}

/**
 * Comme {@link getValidPostgrestData} mais **lève** une `Error` si la charge n’est pas utilisable.
 * Utile dans un flux où une absence de donnée est exceptionnelle.
 */
export function assertValidPostgrestData<T>(result: PostgrestLikeResult<T>, label: string): T {
    const parsed = getValidPostgrestData(result, label)
    if (!parsed.valid) {
        throw new Error(`${MODULE_TAG} [${label}] ${parsed.reason}`)
    }
    return parsed.data
}

/**
 * Pour les listes : retourne un tableau **toujours défini** (éventuellement vide) si `error` est null.
 * Si `error` est présent, retourne `{ rows: [], error }` et loggue l’erreur.
 */
export function getValidPostgrestRows<T>(result: PostgrestLikeResult<T[] | null>, label: string): { rows: T[]; error: Error | null } {
    if (result.error) {
        const msg = result.error.message || 'Erreur PostgREST'
        logError(label, msg, result.error)
        return { rows: [], error: new Error(msg) }
    }
    const rows = result.data
    if (!Array.isArray(rows)) {
        logWarn(label, '`data` n’est pas un tableau — fallback [].', result.data)
        return { rows: [], error: null }
    }
    return { rows, error: null }
}
