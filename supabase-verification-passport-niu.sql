-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : ajout passeport + NIU dans vendor_verifications
-- À exécuter dans Supabase > SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Type de pièce d'identité (CNI par défaut pour les anciennes entrées)
ALTER TABLE vendor_verifications
    ADD COLUMN IF NOT EXISTS id_type TEXT NOT NULL DEFAULT 'cni'
        CHECK (id_type IN ('cni', 'passport'));

-- 2. Photo passeport (null si le vendeur a soumis une CNI)
ALTER TABLE vendor_verifications
    ADD COLUMN IF NOT EXISTS passport_photo_url TEXT;

-- 3. NIU / RCCM — optionnel
ALTER TABLE vendor_verifications
    ADD COLUMN IF NOT EXISTS niu_number TEXT;

-- 4. Rendre cni_photo_url nullable (peut être null si passeport fourni)
ALTER TABLE vendor_verifications
    ALTER COLUMN cni_photo_url DROP NOT NULL;

-- 5. Contrainte : au moins une des deux photos doit être présente
ALTER TABLE vendor_verifications
    DROP CONSTRAINT IF EXISTS verif_id_photo_required;
ALTER TABLE vendor_verifications
    ADD CONSTRAINT verif_id_photo_required CHECK (
        cni_photo_url IS NOT NULL OR passport_photo_url IS NOT NULL
    );

-- 6. Backfill : toutes les entrées existantes sont de type 'cni'
UPDATE vendor_verifications
SET id_type = 'cni'
WHERE id_type IS NULL;
