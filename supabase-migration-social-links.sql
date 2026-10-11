-- ============================================================
-- Migration : Liens réseaux sociaux vendeur (facebook, instagram, tiktok, whatsapp)
-- Auteur     : Claude Code / gautierpolo@icloud.com
-- Usage      : Appliquer dans Supabase SQL Editor (staging d'abord)
--
-- Contexte   : Ajoute 4 colonnes optionnelles sur la table `profiles`
--              pour permettre aux vendeurs de renseigner leurs réseaux sociaux
--              depuis la page "Ma boutique" du dashboard.
-- ============================================================

-- 1. Ajouter les colonnes (idempotent grâce à IF NOT EXISTS)
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS facebook_url   TEXT,
    ADD COLUMN IF NOT EXISTS instagram_url  TEXT,
    ADD COLUMN IF NOT EXISTS tiktok_url     TEXT,
    ADD COLUMN IF NOT EXISTS whatsapp_business TEXT;

-- 2. Contraintes de longueur (optionnel mais recommandé)
ALTER TABLE profiles
    ADD CONSTRAINT IF NOT EXISTS profiles_facebook_url_length   CHECK (char_length(facebook_url)        <= 300),
    ADD CONSTRAINT IF NOT EXISTS profiles_instagram_url_length  CHECK (char_length(instagram_url)       <= 300),
    ADD CONSTRAINT IF NOT EXISTS profiles_tiktok_url_length     CHECK (char_length(tiktok_url)          <= 300),
    ADD CONSTRAINT IF NOT EXISTS profiles_whatsapp_length       CHECK (char_length(whatsapp_business)   <= 20);

-- ============================================================
-- NOTE : Pas besoin de modifier les politiques RLS existantes.
-- Les politiques `profiles` existantes autorisent déjà les
-- vendeurs à mettre à jour leur propre profil (UPDATE WHERE id = auth.uid()).
-- ============================================================

-- Vérification post-migration :
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'profiles'
--   AND column_name IN ('facebook_url','instagram_url','tiktok_url','whatsapp_business');
