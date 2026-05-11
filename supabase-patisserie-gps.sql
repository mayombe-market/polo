-- ═══════════════════════════════════════════════════════════════════════════
-- Migration : Coordonnées GPS des boutiques pâtisserie
-- À exécuter dans Supabase : SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS latitude  float8,
  ADD COLUMN IF NOT EXISTS longitude float8;

COMMENT ON COLUMN public.profiles.latitude  IS 'Latitude GPS de la boutique (renseignée par le vendeur)';
COMMENT ON COLUMN public.profiles.longitude IS 'Longitude GPS de la boutique (renseignée par le vendeur)';

-- Index pour les requêtes géospatiales futures
CREATE INDEX IF NOT EXISTS idx_profiles_gps
  ON public.profiles(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
