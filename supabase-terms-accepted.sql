-- ═══════════════════════════════════════════════════════════════
-- Mayombe Market — Ajout du champ terms_accepted_at
-- ═══════════════════════════════════════════════════════════════
-- Ce script ajoute une colonne pour enregistrer quand l'utilisateur
-- a accepté les conditions d'utilisation (CGU / conditions vendeurs).
--
-- À exécuter dans Supabase → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════

-- Ajouter la colonne terms_accepted_at (nullable, timestamptz)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ DEFAULT NULL;

-- Index pour pouvoir requêter facilement les utilisateurs
-- qui n'ont pas encore accepté les conditions
CREATE INDEX IF NOT EXISTS idx_profiles_terms_accepted
ON profiles (terms_accepted_at)
WHERE terms_accepted_at IS NULL;

-- Vérification
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'terms_accepted_at';
