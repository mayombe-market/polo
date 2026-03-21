-- ═══════════════════════════════════════════════════════════════════════════
-- Mayombe Market — Politiques vendeur sur public.profiles
--
-- Corrige : « could not find the return_policy column of profiles in the schema cache »
-- lors de l’enregistrement des paramètres vendeur (Dashboard → Paramètres).
--
-- À exécuter dans Supabase → SQL Editor → Run.
-- Après exécution, le cache schéma PostgREST se met à jour en général sous ~1 min ;
-- si besoin : Project Settings → API → (recharger / redémarrer selon l’UI).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS return_policy TEXT;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS shipping_info TEXT;

-- Souvent déjà présent ; idempotent si absent
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS bio TEXT;

COMMENT ON COLUMN public.profiles.return_policy IS 'Politique de retour affichée / utilisée côté vendeur (paramètres boutique)';
COMMENT ON COLUMN public.profiles.shipping_info IS 'Infos livraison vendeur (paramètres boutique)';
COMMENT ON COLUMN public.profiles.bio IS 'Description longue boutique (profil public)';
