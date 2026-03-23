/**
 * @fileoverview Client Supabase **navigateur** — singleton, retries réseau, guide d’usage des fetchs.
 *
 * ## Singleton
 * Une seule instance partage Realtime, cache interne et état auth persisté (localStorage).
 * Évite fuites de listeners et requêtes dupliquées.
 *
 * ## Hydratation Next.js / session
 * - Le **premier** `getSupabaseBrowserClient()` peut s’exécuter pendant le **pré-rendu** d’un
 *   composant client (SSR du bundle client) : l’instance existe, mais le **stockage session**
 *   n’est fiable qu’**après hydratation** dans le navigateur.
 * - Pour une lecture auth / `getSession` critique au tout premier paint, préférer :
 *   1. `useEffect` / `useLayoutEffect` (après montage client), ou
 *   2. `await whenBrowserReady()` avant la première requête dépendant de la session.
 *
 * ## Fetches — recommandations
 * 1. **PostgREST** : la promesse résout souvent `{ data, error }` **sans** `throw` → dans `withRetry`,
 *    faites `if (error) throw new Error(error.message)` pour déclencher une relance.
 * 2. **Toujours** passer une **factory** `() => client.from(...).select()` si vous combinez timeout
 *    externe + retry, afin que chaque tentative recrée le builder (voir `lib/supabase-utils.ts`).
 * 3. Utiliser **`withRetry`** pour les lectures sensibles au réseau (DNS, HTTP/3, onglet en veille).
 * 4. Ne pas appeler ce module depuis **Server Components** ou **Route Handlers** : utiliser le client
 *    serveur Supabase (`@supabase/ssr` + cookies) côté serveur.
 *
 * @see {@link withRetry}
 * @see {@link whenBrowserReady}
 * @see {@link SUPABASE_FETCH_MIN_TOTAL_ATTEMPTS}
 */

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Singleton ───────────────────────────────────────────────────────────────

/**
 * Instance unique par **environnement d’exécution** (le bundle Node du SSR a son propre module ;
 * le navigateur a le sien — pas de fuite entre les deux).
 */
let browserClient: SupabaseClient | null = null

function readPublicEnv(): { url: string; key: string } {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
        throw new Error(
            '[supabase-browser] Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et/ou NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        )
    }
    return { url, key }
}

/**
 * Retourne le client singleton navigateur.
 *
 * **Session / hydratation :** cette fonction ne **garantit** pas que la session est déjà relue depuis
 * le stockage ; elle ne fait qu’instancier ou recycler le client. Pour attendre le document prêt,
 * utiliser {@link whenBrowserReady} avant un premier `getSession` / requête protégée si vous voyez
 * des courses avec le premier rendu.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
    if (browserClient) {
        return browserClient
    }

    const { url, key } = readPublicEnv()

    browserClient = createBrowserClient(url, key, {
        auth: {
            flowType: 'pkce',
            persistSession: true,
            detectSessionInUrl: true,
            /**
             * Désactivation de `navigator.locks` : sur certains navigateurs / WebViews, l’API peut
             * bloquer indéfiniment et empêcher `getSession` / refresh de se terminer.
             * On exécute la section critique sans verrou global (acceptable pour une seule instance).
             */
            lock: async <R,>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => fn(),
        },
    })

    return browserClient
}

/**
 * Résout lorsque le document est prêt à interagir avec le stockage et le réseau « habituel ».
 * No-op côté SSR (`window` absent) pour permettre l’import sans casser le pré-rendu.
 *
 * Utile avant un premier fetch critique juste après le montage si vous n’utilisez pas `useEffect`.
 */
export function whenBrowserReady(): Promise<void> {
    if (typeof window === 'undefined') {
        return Promise.resolve()
    }
    if (document.readyState === 'complete') {
        return Promise.resolve()
    }
    return new Promise((resolve) => {
        window.addEventListener('load', () => resolve(), { once: true })
    })
}

// ─── Retries réseau ──────────────────────────────────────────────────────────

/**
 * Minimum **4 tentatives au total** (1 essai initial + **3** relances), conformément aux exigences projet.
 */
export const SUPABASE_FETCH_MIN_TOTAL_ATTEMPTS = 4

const MODULE_TAG = '[supabase-browser]'

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Petit jitter pour éviter le thundering herd si plusieurs onglets relancent en même temps. */
function backoffMs(baseDelayMs: number, attempt: number): number {
    const linear = baseDelayMs * attempt
    const jitter = Math.floor(Math.random() * Math.min(200, linear))
    return linear + jitter
}

/**
 * Heuristique réseau / infra : utilisée par défaut si vous ne passez pas `shouldRetry`.
 * Ne remplace pas une logique métier (ex. 401 attendu).
 */
export function isLikelyRetryableFetchError(err: unknown): boolean {
    if (err == null) {
        return false
    }
    const msg = err instanceof Error ? err.message : String(err)
    const lower = msg.toLowerCase()
    return (
        lower.includes('network')
        || lower.includes('fetch')
        || lower.includes('failed to fetch')
        || lower.includes('timeout')
        || lower.includes('econnreset')
        || lower.includes('etimedout')
        || lower.includes('load failed')
        || lower.includes('502')
        || lower.includes('503')
        || lower.includes('504')
    )
}

export interface WithRetryOptions {
    /**
     * Nombre total de tentatives — **plancher** : {@link SUPABASE_FETCH_MIN_TOTAL_ATTEMPTS} (4).
     */
    maxAttempts?: number
    /** Délai de base pour le backoff linéaire + jitter (ms). */
    baseDelayMs?: number
    /** Identifiant dans les logs (recommandé : `MonComposant maRequête`). */
    label?: string
    /**
     * Si fourni, seules ces erreurs déclenchent une relance. Sinon {@link isLikelyRetryableFetchError}
     * + **toujours** retry sur une erreur non reconnue (comportement conservateur pour `throw` génériques).
     */
    shouldRetry?: (error: unknown, attempt: number) => boolean
}

function defaultShouldRetry(error: unknown): boolean {
    if (isLikelyRetryableFetchError(error)) {
        return true
    }
    /** Erreur inconnue mais levée : on retente (souvent wrap PostgREST / auth imparfait). */
    return true
}

/**
 * Exécute `operation` jusqu’à épuisement des tentatives. Chaque échec **levé** déclenche un backoff.
 *
 * - **Plancher** : {@link SUPABASE_FETCH_MIN_TOTAL_ATTEMPTS} essais.
 * - Logs : `warn` entre les tentatives, `error` sur échec final.
 * - Relance finale : erreur d’origine si `Error`, sinon `Error` enveloppante avec le `label`.
 */
export async function withRetry<T>(operation: () => Promise<T>, options?: WithRetryOptions): Promise<T> {
    const maxAttempts = Math.max(
        SUPABASE_FETCH_MIN_TOTAL_ATTEMPTS,
        options?.maxAttempts ?? SUPABASE_FETCH_MIN_TOTAL_ATTEMPTS,
    )
    const baseDelayMs = options?.baseDelayMs ?? 400
    const label = options?.label ?? 'withRetry'
    const shouldRetry = options?.shouldRetry ?? ((_err: unknown) => defaultShouldRetry(_err))

    let lastError: unknown

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation()
        } catch (err) {
            lastError = err

            const retry = shouldRetry(err, attempt)
            if (!retry || attempt >= maxAttempts) {
                if (attempt >= maxAttempts) {
                    console.error(
                        `${MODULE_TAG} [${label}] Toutes les tentatives ont échoué (${maxAttempts}).`,
                        err,
                    )
                } else {
                    console.error(
                        `${MODULE_TAG} [${label}] Erreur non récupérable (tentative ${attempt}/${maxAttempts}).`,
                        err,
                    )
                }
                break
            }

            const wait = backoffMs(baseDelayMs, attempt)
            console.warn(
                `${MODULE_TAG} [${label}] Tentative ${attempt}/${maxAttempts} échouée — nouvel essai dans ${wait} ms.`,
                err,
            )
            await sleep(wait)
        }
    }

    if (lastError instanceof Error) {
        throw lastError
    }
    throw new Error(`${MODULE_TAG} [${label}] Échec après ${maxAttempts} tentatives.`)
}
