-- ═══════════════════════════════════════════════════════════════════════════
-- Mayombe Market — Colonnes d'archivage manquantes sur public.orders (2026-10-22)
-- Sans elles, la page /admin/orders n'affichait aucune commande depuis le 11/10.
-- 100 % additif : aucune donnée modifiée ni supprimée (toutes les commandes = non archivées).
-- À exécuter dans Supabase : SQL Editor → New query → Coller → Run
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_is_archived ON public.orders (is_archived);

NOTIFY pgrst, 'reload schema';

-- Vérification : doit renvoyer 2 lignes
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders' AND column_name IN ('is_archived', 'archived_at');
