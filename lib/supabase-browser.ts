import { createBrowserClient } from '@supabase/ssr'

/**
 * Singleton Supabase client côté navigateur.
 *
 * Objectif : éviter de recréer plusieurs clients (websocket/realtime, listeners, caches)
 * dans différents composants, ce qui peut saturer CPU/mémoire/réseau.
 *
 * À n'importer que depuis des composants `use client` ou du code exécuté dans le browser.
 */
let browserClient: any | null = null

export function getSupabaseBrowserClient() {
    if (browserClient) return browserClient

    browserClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                flowType: 'pkce',
                persistSession: true,
                detectSessionInUrl: true,
                // Désactiver navigator.locks pour éviter les deadlocks
                // qui bloquent getSession/getUser indéfiniment
                lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
                    return await fn()
                },
            },
        }
    )

    return browserClient
}

