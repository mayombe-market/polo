'use client'

/**
 * Active Zod en mode jitless dans le navigateur (voir lib/zod-jitless.ts).
 * Le layout racine est un Server Component : l’import côté serveur ne suffit pas pour le bundle client.
 */
import '@/lib/zod-jitless'

export function ZodClientInit() {
    return null
}
