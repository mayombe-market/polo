-- ═══════════════════════════════════════════════════════════════════════════
-- Mayombe Market — Avis des clients sans compte (2026-10-24)
-- Le QR code de l'étiquette colis permet de noter une commande. Les commandes
-- passées sans compte n'ont pas de user_id : l'avis doit pouvoir être enregistré.
-- 100 % additif : aucune donnée modifiée ni supprimée.
-- À exécuter dans Supabase : SQL Editor → New query → Coller → Run
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.ratings ALTER COLUMN user_id DROP NOT NULL;

NOTIFY pgrst, 'reload schema';

-- Vérification : doit renvoyer « YES »
SELECT is_nullable FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'ratings' AND column_name = 'user_id';
