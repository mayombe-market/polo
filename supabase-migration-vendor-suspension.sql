-- Migration : suspension vendeurs
-- À appliquer manuellement dans Supabase Dashboard > SQL Editor
-- NE PAS APPLIQUER EN PRODUCTION SANS VALIDATION

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_reason text;

-- Index pour filtrer rapidement les vendeurs actifs dans les listings publics
CREATE INDEX IF NOT EXISTS idx_profiles_vendor_active
  ON profiles (role, is_suspended)
  WHERE role = 'vendor' AND is_suspended = false;

-- Commentaire : après application, vérifier que les RLS policies existantes
-- sur products et profiles ne bloquent pas les updates admin (service_role bypass RLS)
