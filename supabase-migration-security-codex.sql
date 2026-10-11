-- ═══════════════════════════════════════════════════════════════════════════
-- Mayombe Market — Migration sécurité (audit Codex)
-- NE PAS APPLIQUER EN PRODUCTION SANS REVUE ET BACKUP
-- Tester sur staging en premier.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── S2 : Ajouter la vérification du rôle admin dans admin_confirm_order ───
-- La fonction est actuellement callable par tout utilisateur authentifié.
-- On ajoute une vérification interne qui lève une exception si l'appelant
-- n'est pas admin. La layer serveur vérifie aussi, mais on ajoute la défense
-- en profondeur côté base.

CREATE OR REPLACE FUNCTION public.admin_confirm_order(
    p_order_id UUID,
    p_tracking_number TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    rows_affected INT;
    caller_role TEXT;
BEGIN
    -- Vérification interne : seul un admin peut confirmer une commande
    SELECT role INTO caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF caller_role NOT IN ('admin') THEN
        RAISE EXCEPTION 'Accès refusé : rôle admin requis (rôle courant : %)', COALESCE(caller_role, 'inconnu');
    END IF;

    UPDATE public.orders
    SET
        status = 'confirmed',
        tracking_number = p_tracking_number
    WHERE id = p_order_id
      AND status = 'pending';

    GET DIAGNOSTICS rows_affected = ROW_COUNT;

    IF rows_affected = 0 THEN
        RETURN NULL;
    END IF;

    RETURN p_tracking_number;
END;
$$;

COMMENT ON FUNCTION public.admin_confirm_order(UUID, TEXT) IS
    'Confirme atomiquement une commande (pending → confirmed). Vérifie en interne que l'appelant a le rôle admin.';

REVOKE ALL ON FUNCTION public.admin_confirm_order(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_confirm_order(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_confirm_order(UUID, TEXT) TO service_role;


-- ─── S3 : Corriger la politique disputes "service_role_disputes" ────────────
-- La politique FOR ALL USING (true) sans clause TO s'applique à TOUS les rôles,
-- y compris anon. Elle doit être limitée au rôle service_role.

DROP POLICY IF EXISTS "service_role_disputes" ON public.disputes;

CREATE POLICY "service_role_disputes" ON public.disputes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);


-- ─── S4 : Bucket vendor-verifications — passer en privé ────────────────────
-- Si le bucket "vendor-verifications" est public, les pièces d'identité des
-- vendeurs sont accessibles sans authentification.
-- Vérifier d'abord l'existence et le statut avec :
--   SELECT id, name, public FROM storage.buckets WHERE id = 'vendor-verifications';
-- Si public = true, appliquer :

UPDATE storage.buckets
SET public = false
WHERE id = 'vendor-verifications'
  AND public = true;

-- Vérifier que les politiques de lecture existent et requièrent auth.uid() :
-- SELECT * FROM storage.policies WHERE bucket_id = 'vendor-verifications';
-- Si aucune policy SELECT n'existe pour les vendeurs/admins, en créer une.
-- Exemple (adapter selon la structure réelle) :
/*
CREATE POLICY "vendor_verifications_auth_read"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'vendor-verifications' AND (
        -- Le vendeur peut voir ses propres fichiers
        (storage.foldername(name))[1] = auth.uid()::text
        OR
        -- Les admins voient tout
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'comptable')
        )
    )
);
*/


-- ─── S5 : Protéger les colonnes sensibles de la table profiles ─────────────
-- Problème : un utilisateur authentifié pourrait modifier son propre `role`,
-- `verification_status` ou `is_suspended` via la politique UPDATE existante.
-- La politique RLS ne peut pas restreindre à la colonne; on utilise un trigger.
--
-- AVANT d'appliquer : vérifier que la politique UPDATE existante est bien :
--   USING (id = auth.uid())
-- Si elle est absente ou trop permissive, la créer/corriger :
--
--   DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
--   CREATE POLICY "profiles_update_own" ON public.profiles
--       FOR UPDATE
--       TO authenticated
--       USING (id = auth.uid())
--       WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.protect_profiles_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role TEXT;
BEGIN
    -- Détecter une tentative de modification des colonnes sensibles
    IF (NEW.role IS DISTINCT FROM OLD.role)
        OR (NEW.verification_status IS DISTINCT FROM OLD.verification_status)
        OR (NEW.is_suspended IS DISTINCT FROM OLD.is_suspended)
    THEN
        -- Autoriser uniquement les admins
        SELECT role INTO caller_role
        FROM public.profiles
        WHERE id = auth.uid();

        IF COALESCE(caller_role, '') <> 'admin' THEN
            RAISE EXCEPTION 'Modification refusée : role, verification_status et is_suspended sont réservés aux admins.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Attacher le trigger à la table profiles
DROP TRIGGER IF EXISTS trg_protect_profiles_sensitive ON public.profiles;
CREATE TRIGGER trg_protect_profiles_sensitive
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profiles_sensitive_columns();

COMMENT ON FUNCTION public.protect_profiles_sensitive_columns() IS
    'Empêche tout utilisateur non-admin de modifier role, verification_status ou is_suspended.';


-- ─── Vérification post-migration ────────────────────────────────────────────
-- Tester après application :
-- 1. Un utilisateur non-admin ne peut pas appeler admin_confirm_order → doit
--    lever "Accès refusé : rôle admin requis"
-- 2. Un utilisateur anon ne peut pas lire les disputes → 0 lignes retournées
-- 3. Le bucket vendor-verifications est private → URL directes retournent 403
-- 4. Un utilisateur tente UPDATE profiles SET role='admin' → doit lever
--    "Modification refusée : role, verification_status et is_suspended sont réservés aux admins."
