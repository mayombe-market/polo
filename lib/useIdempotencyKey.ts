/**
 * Hook d'idempotency pour la création de commande.
 *
 * Principe :
 *  - Une clé unique est générée côté client AVANT le submit.
 *  - Elle est stockée en sessionStorage avec un TTL de 2h.
 *  - Si le réseau coupe après le submit, le client peut recommencer :
 *    la même clé est renvoyée → le serveur retourne la commande existante.
 *  - Après succès confirmé, on efface la clé → le prochain checkout en génère une nouvelle.
 */

import { useCallback } from 'react'

const STORAGE_KEY = 'mayombe_idem_key'
const TTL_MS      = 2 * 60 * 60 * 1000 // 2 heures

interface StoredKey {
    key: string
    ts:  number
}

function generateKey(): string {
    // crypto.randomUUID est disponible sur tous les navigateurs modernes
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
    }
    // Fallback
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function useIdempotencyKey() {
    /**
     * Renvoie la clé existante (si < 2h) ou en génère une nouvelle.
     * À appeler JUSTE AVANT le submit — pas à l'init du composant
     * pour éviter de consommer une clé au simple chargement de la page.
     */
    const getOrCreate = useCallback((): string => {
        if (typeof window === 'undefined') return generateKey()

        try {
            const raw = sessionStorage.getItem(STORAGE_KEY)
            if (raw) {
                const stored: StoredKey = JSON.parse(raw)
                if (stored.key && Date.now() - stored.ts < TTL_MS) {
                    return stored.key
                }
            }
        } catch {
            // sessionStorage inaccessible (mode privé strict) → clé ephémère
        }

        const key = generateKey()
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ key, ts: Date.now() } satisfies StoredKey))
        } catch {}
        return key
    }, [])

    /**
     * À appeler après confirmation réussie de la commande.
     * Force la génération d'une nouvelle clé au prochain checkout.
     */
    const clear = useCallback((): void => {
        try {
            if (typeof window !== 'undefined') sessionStorage.removeItem(STORAGE_KEY)
        } catch {}
    }, [])

    return { getOrCreate, clear }
}
