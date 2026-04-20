-- ═══════════════════════════════════════════════════════════════════════════
-- Migration : système hôtellerie (vendor_type hotel + plans hotel_*)
-- À exécuter dans Supabase SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Étendre la contrainte vendor_type pour inclure 'hotel'
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_vendor_type_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_vendor_type_check
CHECK (vendor_type IN ('marketplace', 'immobilier', 'hotel'));

-- 2. Étendre la contrainte subscription_plan pour inclure les plans hôteliers
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_subscription_plan_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_subscription_plan_check
CHECK (
    subscription_plan IS NULL
    OR subscription_plan IN (
        -- Marketplace
        'gratuit', 'free', 'starter', 'pro', 'premium',
        -- Immobilier
        'immo_free', 'immo_agent', 'immo_agence',
        -- Hôtellerie
        'hotel_free', 'hotel_pro', 'hotel_chain'
    )
);

-- 3. S'assurer que la colonne vendor_type accepte bien 'hotel'
-- (déjà fait par la contrainte ci-dessus, mais on force le DEFAULT si besoin)
ALTER TABLE public.profiles
ALTER COLUMN vendor_type SET DEFAULT 'marketplace';

-- 4. Vérification rapide
SELECT
    vendor_type,
    subscription_plan,
    COUNT(*) AS nb
FROM public.profiles
WHERE role = 'vendor'
GROUP BY vendor_type, subscription_plan
ORDER BY vendor_type, subscription_plan;
