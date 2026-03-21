-- ═══════════════════════════════════════════════════════════════════════════
-- Mayombe Market — Colonnes boutique sur public.profiles
-- À exécuter dans Supabase → SQL Editor (idempotent, réexécutable)
--
-- Corrige les erreurs du type « column shop_category does not exist » si un
-- trigger, une vue ou le code met à jour ces champs.
-- ═══════════════════════════════════════════════════════════════════════════

-- Nom affiché boutique (legacy + nouveau)
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS shop_name TEXT;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS store_name TEXT;

-- Catégorie / description boutique (optionnelles, peuvent rester NULL)
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS shop_category TEXT;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS shop_description TEXT;

COMMENT ON COLUMN public.profiles.shop_name IS 'Nom commercial boutique (alias historique)';
COMMENT ON COLUMN public.profiles.store_name IS 'Nom boutique affiché (prioritaire côté app si renseigné)';
COMMENT ON COLUMN public.profiles.shop_category IS 'Catégorie principale de la boutique (optionnel)';
COMMENT ON COLUMN public.profiles.shop_description IS 'Description courte de la boutique (optionnel)';

-- Paramètres vendeur (Dashboard → Paramètres) — évite erreur schema cache si absentes
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS return_policy TEXT;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS shipping_info TEXT;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS bio TEXT;
