/**
 * Plafonds réseau pour Supabase / auth (réseaux à forte latence, ex. Congo).
 * Utiliser partout pour éviter des coupures prématurées.
 */
export const NETWORK_TIMEOUT_MS = 90_000
