-- ═══════════════════════════════════════════════════════════════════════════
-- Mayombe Market — RLS & colonne shop_description (slogan boutique)
--
-- Prérequis : exécuter d’abord supabase-profiles-shop-description.sql (ADD COLUMN).
--
-- En PostgreSQL / Supabase, les politiques RLS s’appliquent à la LIGNE entière,
-- pas colonne par colonne. La policy existante :
--   "Modifier son propre profil" … USING (auth.uid() = id) WITH CHECK (auth.uid() = id)
-- autorise déjà un UPDATE sur TOUTES les colonnes modifiables du profil, y compris
-- shop_description, tant que l’utilisateur ne modifie que sa propre ligne.
--
-- Ce script ne crée pas de policy « dédiée » à shop_description (redondant) ;
-- il ré-applique les mêmes règles que supabase-profiles-rls-and-subscription-rpc.sql
-- pour garder un fichier unique documenté pour le slogan.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS shop_description TEXT;

COMMENT ON COLUMN public.profiles.shop_description IS
    'Slogan boutique (≤ 75 car. côté app). Modifiable par le propriétaire via policy UPDATE profil.';

-- Même logique que le script RLS global (idempotent)
DROP POLICY IF EXISTS "Modifier son propre profil" ON public.profiles;
CREATE POLICY "Modifier son propre profil" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Option : limite stricte en base (décommenter si souhaité)
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_shop_description_len;
-- ALTER TABLE public.profiles ADD CONSTRAINT profiles_shop_description_len
--   CHECK (shop_description IS NULL OR char_length(shop_description) <= 75);
