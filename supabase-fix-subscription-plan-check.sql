-- ═══════════════════════════════════════════════════════════════════════════
-- Fix : contrainte CHECK sur profiles.subscription_plan
-- Problème : "profiles_subscription_plan_check" bloque l'activation des abonnements
-- Solution : recréer la contrainte avec toutes les valeurs valides
-- À exécuter dans Supabase : SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Supprimer l'ancienne contrainte (quelle que soit sa définition actuelle)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_subscription_plan_check;

-- 2. Recréer avec toutes les valeurs autorisées par l'app
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_subscription_plan_check
CHECK (
    subscription_plan IS NULL
    OR subscription_plan IN ('gratuit', 'free', 'starter', 'pro', 'premium')
);
