/**
 * Utilitaires Supabase — protection contre les timeouts et les hangs
 *
 * getUser() de Supabase peut parfois rester bloqué indéfiniment
 * (réseau lent, token expiré, serveur injoignable). Ce wrapper
 * ajoute un timeout de sécurité pour éviter les chargements infinis.
 */

export type SafeGetUserStatus = 'ok' | 'no-user' | 'timeout' | 'network-error' | 'unknown-error'

export interface SafeGetUserResult<UserType = any> {
    user: UserType | null
    status: SafeGetUserStatus
    error?: Error
}

/**
 * Appelle supabase.auth.getUser() avec un timeout de sécurité.
 * Contrairement à l'ancienne version, différencie :
 * - utilisateur inexistant (no-user)
 * - timeout réseau / lenteur (timeout / network-error)
 * - autres erreurs (unknown-error)
 *
 * @param supabase - Instance du client Supabase
 * @param timeoutMs - Timeout en millisecondes (défaut: 5000ms)
 * @returns Un objet décrivant l'utilisateur et le statut de l'appel
 */
export async function safeGetUser(supabase: any, timeoutMs = 5000): Promise<SafeGetUserResult> {
    const timeoutError = new Error('Auth timeout')

    try {
        const result = await Promise.race([
            supabase.auth.getUser(),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(timeoutError), timeoutMs)
            ),
        ])

        const user = (result as any)?.data?.user ?? null

        if (!user) {
            return { user: null, status: 'no-user' }
        }

        return { user, status: 'ok' }
    } catch (err: any) {
        if (err === timeoutError || err?.message === timeoutError.message) {
            return { user: null, status: 'timeout', error: err }
        }

        if (typeof err?.message === 'string' && err.message.toLowerCase().includes('network')) {
            return { user: null, status: 'network-error', error: err }
        }

        return { user: null, status: 'unknown-error', error: err instanceof Error ? err : undefined }
    }
}

/**
 * Exécute une requête Supabase avec un timeout de sécurité.
 * Empêche les requêtes de rester bloquées indéfiniment.
 *
 * @param queryPromise - La promesse de requête Supabase
 * @param timeoutMs - Timeout en millisecondes (défaut: 10000ms)
 * @returns Le résultat de la requête
 */
export async function withTimeout<T>(queryPromise: Promise<T>, timeoutMs = 10000): Promise<T> {
    return Promise.race([
        queryPromise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
        ),
    ])
}
