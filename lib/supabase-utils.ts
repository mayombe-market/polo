/**
 * Utilitaires Supabase — protection contre les timeouts et les hangs
 *
 * getUser() de Supabase peut parfois rester bloqué indéfiniment
 * (réseau lent, token expiré, serveur injoignable). Ce wrapper
 * ajoute un timeout de sécurité pour éviter les chargements infinis.
 */

/**
 * Appelle supabase.auth.getUser() avec un timeout de sécurité.
 * Si l'appel dépasse le timeout, retourne null au lieu de bloquer.
 *
 * @param supabase - Instance du client Supabase
 * @param timeoutMs - Timeout en millisecondes (défaut: 5000ms)
 * @returns L'utilisateur ou null
 */
export async function safeGetUser(supabase: any, timeoutMs = 5000): Promise<any | null> {
    try {
        const result = await Promise.race([
            supabase.auth.getUser(),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Auth timeout')), timeoutMs)
            ),
        ])
        return (result as any)?.data?.user ?? null
    } catch {
        return null
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
