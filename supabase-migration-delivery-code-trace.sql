-- ═══════════════════════════════════════════════════════════════════════════
-- Mayombe Market — Traçabilité du code de livraison (paiement à la livraison)
-- Le RPC consume_delivery_code efface delivery_code une fois utilisé : on garde
-- une copie pour l'admin. 100 % additif, aucune donnée modifiée.
-- À exécuter dans Supabase : SQL Editor → New query → Coller → Run
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS delivery_code_used text;

NOTIFY pgrst, 'reload schema';

-- Vérification : doit renvoyer 1 ligne
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_code_used';
