-- ═══════════════════════════════════════════════════════
-- Migration : vendor_type + plans immobilier
-- À exécuter dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- 1. Colonne vendor_type sur profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS vendor_type text DEFAULT 'marketplace';

-- Contrainte : seulement marketplace ou immobilier
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_vendor_type_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_vendor_type_check
CHECK (vendor_type IN ('marketplace', 'immobilier'));

-- 2. Mettre à jour la contrainte subscription_plan pour inclure les plans immo
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_subscription_plan_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_subscription_plan_check
CHECK (subscription_plan IN (
  'gratuit', 'free',
  'starter', 'pro', 'premium',
  'immo_free', 'immo_agent', 'immo_agence'
));

-- 3. Remplir vendor_type pour les vendeurs existants (tous marketplace)
UPDATE profiles
SET vendor_type = 'marketplace'
WHERE role = 'vendor' AND vendor_type IS NULL;

-- 4. Remplir subscription_plan pour les vendeurs immobilier déjà existants
-- (si tu en as, sinon ce UPDATE ne change rien)
-- UPDATE profiles SET subscription_plan = 'immo_free' WHERE vendor_type = 'immobilier' AND (subscription_plan IS NULL OR subscription_plan = 'gratuit');

-- Vérification
SELECT
  vendor_type,
  COUNT(*) AS nb_vendeurs,
  subscription_plan
FROM profiles
WHERE role = 'vendor'
GROUP BY vendor_type, subscription_plan
ORDER BY vendor_type, subscription_plan;
