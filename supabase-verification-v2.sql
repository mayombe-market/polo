-- ─────────────────────────────────────────────────────────────────────────────
-- Migration v2 : vérification vendeur
-- Nouveaux champs : RCCM, photo unique, nom gérant, adresse GPS
-- Supprime les contraintes MoMo + photo boutique du form
-- À exécuter dans Supabase > SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Nouveaux champs
ALTER TABLE vendor_verifications
    ADD COLUMN IF NOT EXISTS rccm_number   TEXT    DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS id_photo_url  TEXT    DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS manager_name  TEXT    DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS address       TEXT    DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS address_lat   FLOAT8  DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS address_lng   FLOAT8  DEFAULT NULL;

-- 2. Étendre le check id_type pour inclure 'permis'
ALTER TABLE vendor_verifications
    DROP CONSTRAINT IF EXISTS vendor_verifications_id_type_check;
ALTER TABLE vendor_verifications
    ADD CONSTRAINT vendor_verifications_id_type_check
    CHECK (id_type IN ('cni', 'passport', 'permis'));

-- 3. Rendre shop_photo_url nullable (section supprimée du formulaire)
ALTER TABLE vendor_verifications
    ALTER COLUMN shop_photo_url DROP NOT NULL;

-- 4. Rendre momo_name et momo_number nullable
ALTER TABLE vendor_verifications
    ALTER COLUMN momo_name   DROP NOT NULL;
ALTER TABLE vendor_verifications
    ALTER COLUMN momo_number DROP NOT NULL;

-- 5. Supprimer le NOT NULL + CHECK sur momo_operator
ALTER TABLE vendor_verifications
    DROP CONSTRAINT IF EXISTS vendor_verifications_momo_operator_check;
ALTER TABLE vendor_verifications
    ALTER COLUMN momo_operator DROP NOT NULL;

-- 6. Rendre cni_name nullable (remplacé par manager_name)
ALTER TABLE vendor_verifications
    ALTER COLUMN cni_name DROP NOT NULL;

-- 7. Supprimer la contrainte photo legacy (remplacée par id_photo_url)
ALTER TABLE vendor_verifications
    DROP CONSTRAINT IF EXISTS verif_id_photo_required;
