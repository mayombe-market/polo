-- ═══════════════════════════════════════════════════════════════════════════
-- Mayombe Market — Plan différé : Option A
-- Quand un vendeur change de plan en cours d'abonnement, le nouveau plan
-- attend la fin de l'abonnement actuel avant de s'activer.
--
-- À exécuter dans Supabase : SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Nouvelles colonnes sur profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS subscription_next_plan       TEXT,
    ADD COLUMN IF NOT EXISTS subscription_next_billing    TEXT,
    ADD COLUMN IF NOT EXISTS subscription_next_end_date   TIMESTAMPTZ;

-- 2. Contrainte CHECK sur subscription_next_plan (mêmes valeurs autorisées)
ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_subscription_next_plan_check;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_subscription_next_plan_check
    CHECK (
        subscription_next_plan IS NULL
        OR subscription_next_plan IN ('gratuit', 'free', 'starter', 'pro', 'premium')
    );

-- 3. RPC : planifier le prochain plan (appelé à la confirmation admin)
CREATE OR REPLACE FUNCTION public.admin_schedule_next_plan(
    p_user_id             UUID,
    p_next_plan           TEXT,
    p_next_billing        TEXT,
    p_next_end_date       TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN RAISE EXCEPTION 'Non autorisé'; END IF;

    UPDATE public.profiles
    SET
        subscription_next_plan     = p_next_plan,
        subscription_next_billing  = p_next_billing,
        subscription_next_end_date = p_next_end_date,
        updated_at                 = NOW()
    WHERE id = p_user_id;

    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_schedule_next_plan(UUID, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_schedule_next_plan(UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_schedule_next_plan(UUID, TEXT, TEXT, TIMESTAMPTZ) TO service_role;

-- 4. RPC : appliquer le plan différé (appelé côté client quand l'abonnement actuel expire)
CREATE OR REPLACE FUNCTION public.apply_pending_plan(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile public.profiles%ROWTYPE;
BEGIN
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;

    -- Vérifier qu'il y a bien un plan en attente et que l'abonnement actuel est expiré
    IF v_profile.subscription_next_plan IS NULL THEN RETURN FALSE; END IF;
    IF v_profile.subscription_end_date IS NULL OR v_profile.subscription_end_date > NOW() THEN
        RETURN FALSE;
    END IF;

    UPDATE public.profiles
    SET
        subscription_plan          = v_profile.subscription_next_plan,
        subscription_billing       = v_profile.subscription_next_billing,
        subscription_start_date    = NOW(),
        subscription_end_date      = v_profile.subscription_next_end_date,
        subscription_next_plan     = NULL,
        subscription_next_billing  = NULL,
        subscription_next_end_date = NULL,
        updated_at                 = NOW()
    WHERE id = p_user_id;

    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_pending_plan(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_pending_plan(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_pending_plan(UUID) TO service_role;
