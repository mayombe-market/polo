import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Client Supabase navigateur — singleton.
 *
 * Pourquoi un singleton : évite plusieurs instances (Realtime, listeners, caches)
 * qui peuvent saturer réseau / mémoire et provoquer des comportements erratiques.
 *
 * IMPORTANT — premier rendu / hydratation Next.js :
 * N'appelez `getSupabaseBrowserClient()` qu'après montage côté client (ex. dans `useEffect`),
 * pas au top-level d'un module importé tôt, sinon la première requête peut partir avant
 * que la session / le stockage local soient prêts → page vide jusqu'au refresh.
 */
let browserClient: SupabaseClient | null = null

/**
 * Retourne le client singleton.
 *
 * Note : d’autres modules du projet appellent cette fonction au chargement du fichier.
 * Pour les pages sensibles au « premier rendu vide », préférez tout de même un appel
 * à l’intérieur de `useEffect` pour que la première requête parte après hydratation.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
    if (browserClient) return browserClient

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
        throw new Error('[supabase-browser] NEXT_PUBLIC_SUPABASE_URL ou ANON_KEY manquant.')
    }

    browserClient = createBrowserClient(url, key, {
        auth: {
            flowType: 'pkce',
            persistSession: true,
            detectSessionInUrl: true,
            // Pas de navigator.locks : certains navigateurs bloquent getSession indéfiniment.
            lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn(),
        },
    })

    return browserClient
}

/** Nombre minimal de tentatives totales = 1 essai + au moins 3 nouvelles tentatives après échec. */
export const SUPABASE_FETCH_MIN_TOTAL_ATTEMPTS = 4

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Exécute `operation` plusieurs fois en cas d'échec (erreur levée).
 * Délai entre tentatives : backoff linéaire (baseDelayMs * numéro de tentative).
 *
 * Utilisation typique : appels réseau Supabase sensibles au premier chargement (DNS, HTTP/3, etc.).
 */
export async function withRetry<T>(
    operation: () => Promise<T>,
    options?: {
        /** Total de tentatives ; forcé à ≥ SUPABASE_FETCH_MIN_TOTAL_ATTEMPTS (4 = 1 + 3 retries). */
        maxAttempts?: number
        baseDelayMs?: number
        /** Préfixe pour console en cas d'échec intermédiaire */
        label?: string
    },
): Promise<T> {
    const maxAttempts = Math.max(SUPABASE_FETCH_MIN_TOTAL_ATTEMPTS, options?.maxAttempts ?? SUPABASE_FETCH_MIN_TOTAL_ATTEMPTS)
    const baseDelayMs = options?.baseDelayMs ?? 400
    const label = options?.label ?? 'withRetry'

    let lastError: unknown

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation()
        } catch (err) {
            lastError = err
            if (attempt >= maxAttempts) {
                console.error(`[${label}] Toutes les tentatives ont échoué (${maxAttempts}).`, err)
                break
            }
            const wait = baseDelayMs * attempt
            console.warn(`[${label}] Tentative ${attempt}/${maxAttempts} échouée, nouvel essai dans ${wait}ms`, err)
            await sleep(wait)
        }
    }

    throw lastError instanceof Error
        ? lastError
        : new Error(`[${label}] Échec après ${maxAttempts} tentatives.`)
}
