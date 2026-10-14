-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION SÉCURITÉ P0 — À VALIDER AVANT APPLICATION
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PRÉREQUIS AVANT APPLICATION :
--
-- 1. Bucket vendor-verifications → passer en privé (section 1 ci-dessous)
--    - Les signed URLs stockées en DB restent valides jusqu'à 90 j après upload
--    - Pour les vieilles vérifications (> 90 j) : ajouter la fonction admin
--      de régénération de signed URL dans app/admin/verifications/
--    - Tester l'affichage admin AVANT d'appliquer en prod
--
-- 2. RLS litiges — seller SELECT (section 2 ci-dessous)
--    - Vérifie que les vendeurs voient leurs propres litiges dans le dashboard
--    - Actuellement seller_id est nullable — vérifier la cohérence en prod
--
-- ROLLBACK :
--    -- Section 1 : remettre le bucket public
--    UPDATE storage.buckets SET public = true WHERE id = 'vendor-verifications';
--    -- Section 2 : supprimer la policy ajoutée
--    DROP POLICY IF EXISTS "sellers_select_own_disputes" ON public.disputes;
--
-- NE PAS APPLIQUER SANS :
--   - Test en staging
--   - Validation visuelle de l'admin verifications après passage en privé
--   - Confirmation que les vieilles signed URLs (> 90 j) sont gérées
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- SECTION 1 : Rendre le bucket KYC privé
-- ─────────────────────────────────────────────────────────────────────────

-- Passer le bucket en non-public (les URLs signées restent fonctionnelles)
UPDATE storage.buckets
SET public = false
WHERE id = 'vendor-verifications';

-- Politique de lecture admin : permet aux admins de créer des signed URLs
-- (nécessaire si on ajoute un endpoint de régénération côté serveur)
DROP POLICY IF EXISTS "admin_read_vendor_verifications" ON storage.objects;
CREATE POLICY "admin_read_vendor_verifications" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'vendor-verifications'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- ─────────────────────────────────────────────────────────────────────────
-- SECTION 2 : RLS litiges — vendeur peut lire ses propres litiges
-- ─────────────────────────────────────────────────────────────────────────

-- Les vendeurs (seller_id) peuvent lire les litiges qui les concernent
-- Utile pour afficher dans le dashboard vendeur si cette fonctionnalité est ajoutée
DROP POLICY IF EXISTS "sellers_select_own_disputes" ON public.disputes;
CREATE POLICY "sellers_select_own_disputes" ON public.disputes
    FOR SELECT
    USING (
        auth.uid() = seller_id
        AND seller_id IS NOT NULL
    );

-- ─────────────────────────────────────────────────────────────────────────
-- SECTION 3 : RPC admin_confirm_order — vérification ownership (idempotent)
-- ─────────────────────────────────────────────────────────────────────────
-- La RPC admin_confirm_order existe déjà en prod.
-- Vérifier qu'elle contient un check sur le rôle admin avant d'agir.
-- Aucun changement SQL ici — juste documenter pour audit.
--
-- À vérifier avec : \df admin_confirm_order dans psql
-- ─────────────────────────────────────────────────────────────────────────
