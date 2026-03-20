-- ═══════════════════════════════════════════════════════════════════
-- Storage : bucket vendor-verifications (KYC vendeur)
-- ═══════════════════════════════════════════════════════════════════
-- 1) Dashboard Supabase → Storage → New bucket
--    - Name: vendor-verifications
--    - Public: ON (les URLs publiques sont utilisées comme pour `products`)
--
-- 2) Policies (Storage → Policies) : autoriser INSERT/UPDATE pour authenticated
--    sur le préfixe verifications/{auth.uid()}/ — voir doc Supabase "Storage RLS".
--
-- Exemple (à valider selon votre version Postgres ; supprimer les policies en doublon si besoin) :

INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-verifications', 'vendor-verifications', true)
ON CONFLICT (id) DO NOTHING;
