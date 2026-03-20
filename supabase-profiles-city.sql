-- Colonne ville profil (si absente). Déjà utilisée par le checkout / admin.
-- À exécuter dans Supabase SQL Editor si besoin.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;

COMMENT ON COLUMN profiles.city IS 'Ville de résidence / livraison (ex: Brazzaville, Pointe-Noire)';
