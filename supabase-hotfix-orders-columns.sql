-- ═══════════════════════════════════════════════════════════════════════════
-- Mayombe Market — Colonnes manquantes sur public.orders (constaté le 2026-10-21)
-- Le code les envoie depuis mai 2026 ; leur absence bloquait toute création de commande.
-- 100 % additif : colonnes facultatives (NULL), aucune donnée modifiée ni supprimée.
-- À exécuter dans Supabase : SQL Editor → New query → Coller → Run
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS idempotency_key        text,
    ADD COLUMN IF NOT EXISTS utm_source             text,
    ADD COLUMN IF NOT EXISTS utm_medium             text,
    ADD COLUMN IF NOT EXISTS utm_campaign           text,
    ADD COLUMN IF NOT EXISTS attribution_session_id text;

-- Anti-doublon : même client + même clé = même commande (réseau coupé pendant l'envoi)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_user_idempotency
    ON public.orders (user_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- Rafraîchit le cache de l'API Supabase pour que les nouvelles colonnes soient visibles tout de suite
NOTIFY pgrst, 'reload schema';

-- Vérification : doit renvoyer 5 lignes
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders'
  AND column_name IN ('idempotency_key','utm_source','utm_medium','utm_campaign','attribution_session_id');
