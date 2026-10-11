-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION COMPLÉMENTAIRE v3 — vérification vendeur
-- Corrige les colonnes manquantes et sécurise les documents.
--
-- ⚠️  À examiner et valider avant exécution.
-- ⚠️  Exécuter APRÈS avoir appliqué supabase-vendor-verification.sql (v1)
--     et supabase-verification-v2.sql (v2).
-- ⚠️  Toutes les instructions utilisent IF NOT EXISTS / IF EXISTS :
--     idempotentes, sans risque de perte de données si déjà appliquées.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Colonnes manquantes ───────────────────────────────────────────────

-- 1a. id_type (type de pièce d'identité)
--     Absent de v1 ; v2 ajoute une contrainte dessus sans créer la colonne.
ALTER TABLE vendor_verifications
    ADD COLUMN IF NOT EXISTS id_type TEXT DEFAULT NULL;

-- 1b. niu_number (Numéro d'Identification Unique)
ALTER TABLE vendor_verifications
    ADD COLUMN IF NOT EXISTS niu_number TEXT DEFAULT NULL;

-- 1c. passport_photo_url (photo passeport — colonne legacy, insert null)
ALTER TABLE vendor_verifications
    ADD COLUMN IF NOT EXISTS passport_photo_url TEXT DEFAULT NULL;

-- ─── 2. Contrainte CHECK sur id_type (safe : DROP IF EXISTS avant ADD) ────
--     v2 le fait déjà, mais cette instruction est idempotente.
ALTER TABLE vendor_verifications
    DROP CONSTRAINT IF EXISTS vendor_verifications_id_type_check;

ALTER TABLE vendor_verifications
    ADD CONSTRAINT vendor_verifications_id_type_check
    CHECK (id_type IN ('cni', 'passport', 'permis'));

-- ─── 3. Contrainte CHECK sur status — étendre avec 'verified' ─────────────
--     v1 déclare : CHECK (status IN ('pending', 'approved', 'rejected'))
--     Le code profiles met à jour verification_status = 'verified' après
--     approbation, mais la table vendor_verifications conserve 'approved'.
--     Pas de changement nécessaire ici — statuts vendor_verifications OK.

-- ─── 4. Politique storage — documents privés ─────────────────────────────
--     Le bucket doit être PRIVÉ (public=false).
--     Ces policies donnent accès uniquement au propriétaire + admins.
--     À ignorer si les policies existent déjà (noms identiques → no-op).

-- Vendeur : lecture de ses propres documents
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Vendor reads own verification docs'
    ) THEN
        CREATE POLICY "Vendor reads own verification docs"
        ON storage.objects FOR SELECT
        USING (
            bucket_id = 'vendor-verifications'
            AND auth.uid()::text = (storage.foldername(name))[1]
        );
    END IF;
END $$;

-- Vendeur : upload de ses propres documents
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Vendor uploads own verification docs'
    ) THEN
        CREATE POLICY "Vendor uploads own verification docs"
        ON storage.objects FOR INSERT
        WITH CHECK (
            bucket_id = 'vendor-verifications'
            AND auth.uid()::text = (storage.foldername(name))[1]
        );
    END IF;
END $$;

-- Admin : lecture de tous les documents de vérification
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Admin reads all verification docs'
    ) THEN
        CREATE POLICY "Admin reads all verification docs"
        ON storage.objects FOR SELECT
        USING (
            bucket_id = 'vendor-verifications'
            AND EXISTS (
                SELECT 1 FROM profiles
                WHERE id = auth.uid() AND role = 'admin'
            )
        );
    END IF;
END $$;

-- ─── 5. Recréer les RPCs pour garantir leur version actuelle ─────────────
--     CREATE OR REPLACE est idempotent — aucun risque.

CREATE OR REPLACE FUNCTION approve_vendor_verification(
    p_verification_id UUID,
    p_admin_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE vendor_verifications
    SET status = 'approved',
        reviewed_by = p_admin_id,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_verification_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    UPDATE profiles
    SET verification_status = 'verified',
        updated_at = NOW()
    WHERE id = (
        SELECT vendor_id FROM vendor_verifications WHERE id = p_verification_id
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_vendor_verification(
    p_verification_id UUID,
    p_admin_id UUID,
    p_reason TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'Le motif de refus est obligatoire';
    END IF;

    UPDATE vendor_verifications
    SET status = 'rejected',
        reviewed_by = p_admin_id,
        reviewed_at = NOW(),
        rejection_reason = trim(p_reason),
        updated_at = NOW()
    WHERE id = p_verification_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    UPDATE profiles
    SET verification_status = 'rejected',
        updated_at = NOW()
    WHERE id = (
        SELECT vendor_id FROM vendor_verifications WHERE id = p_verification_id
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 6. Vérification finale (lecture) ────────────────────────────────────
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'vendor_verifications'
ORDER BY ordinal_position;
