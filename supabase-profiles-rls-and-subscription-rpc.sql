-- ═══════════════════════════════════════════════════════════════════════════
-- Mayombe Market — RLS profiles + RPC activation abonnement (admin)
-- À exécuter dans Supabase : SQL Editor → Run
--
-- 1) Politiques UPDATE claires (soi-même + admin) avec WITH CHECK explicite
-- 2) RPC SECURITY DEFINER : l’admin active / réinitialise l’abonnement sans
--    dépendre du RLS (contourne les cas où les policies ne s’appliquent pas
--    comme prévu avec le client anon + session admin).
--
-- Note : la clé service_role (serveur) contourne déjà le RLS dans Supabase ;
--        ce script corrige le flux « admin connecté via JWT » côté app.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Profils : recréer les policies UPDATE (idempotent) ───────────────────

DROP POLICY IF EXISTS "Modifier son propre profil" ON public.profiles;
CREATE POLICY "Modifier son propre profil" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admin modifie tous les profils" ON public.profiles;
CREATE POLICY "Admin modifie tous les profils" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles AS p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles AS p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- ─── RPC : mise à jour abonnement vendeur (appelée par l’app après vérif admin côté code + ici) ───

CREATE OR REPLACE FUNCTION public.admin_update_vendor_subscription(
    p_user_id UUID,
    p_subscription_plan TEXT DEFAULT NULL,
    p_subscription_billing TEXT DEFAULT NULL,
    p_subscription_start_date TIMESTAMPTZ DEFAULT NULL,
    p_subscription_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Non authentifié';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Non autorisé';
    END IF;

    -- Réinitialisation : pas de plan (ex. annulation abonnement par admin)
    IF p_subscription_plan IS NULL THEN
        UPDATE public.profiles
        SET
            subscription_plan = NULL,
            subscription_start_date = NULL,
            subscription_end_date = NULL,
            subscription_billing = NULL,
            updated_at = NOW()
        WHERE id = p_user_id;
    ELSE
        UPDATE public.profiles
        SET
            subscription_plan = p_subscription_plan,
            subscription_billing = p_subscription_billing,
            subscription_start_date = p_subscription_start_date,
            subscription_end_date = p_subscription_end_date,
            updated_at = NOW()
        WHERE id = p_user_id;
    END IF;

    RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.admin_update_vendor_subscription(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
    'Admin uniquement : active ou réinitialise les champs d’abonnement sur un profil vendeur (bypass RLS).';

REVOKE ALL ON FUNCTION public.admin_update_vendor_subscription(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_vendor_subscription(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_vendor_subscription(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
