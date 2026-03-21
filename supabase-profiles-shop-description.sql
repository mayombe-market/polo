-- ═══════════════════════════════════════════════════════════════════════════
-- Mayombe Market — Slogan boutique (profiles.shop_description)
--
-- Texte court (max 75 car. côté app) affiché sous le nom de la boutique.
-- Exécuter dans Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS shop_description TEXT;

COMMENT ON COLUMN public.profiles.shop_description IS 'Slogan / accroche boutique (recommandé ≤ 75 car., validé côté application).';

-- Option stricte (décommenter si tu veux imposer la limite en base) :
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_shop_description_len;
-- ALTER TABLE public.profiles ADD CONSTRAINT profiles_shop_description_len
--   CHECK (shop_description IS NULL OR char_length(shop_description) <= 75);
