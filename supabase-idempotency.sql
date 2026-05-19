-- ═══════════════════════════════════════════════════════════════════════════
-- Mayombe Market — Idempotency sur la création de commande
-- Évite les doublons quand le réseau coupe entre le submit et la réponse.
-- À exécuter dans Supabase : SQL Editor → New query → Coller → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- Colonne idempotency_key : clé unique générée côté client avant chaque submit
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT DEFAULT NULL;

COMMENT ON COLUMN public.orders.idempotency_key IS
    'Clé UUID générée côté client avant le submit. Permet de renvoyer la commande existante si le réseau coupe entre le submit et la réponse (pas de double commande).';

-- Index unique par user_id pour que deux utilisateurs différents
-- puissent théoriquement avoir la même clé sans conflit.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_user_idempotency
    ON public.orders (user_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;
