-- Mayombe Market - Migration securite (audit Codex)
-- Version : 2025-10-11
-- NE PAS APPLIQUER EN PRODUCTION SANS BACKUP
-- Executer les requetes de verification (section AVANT) avant d'appliquer.


-- ===========================================================================
-- S2 : Fonction admin_confirm_order avec verification role interne
-- ===========================================================================
-- Un seul appelant : adminConfirmPayment() dans app/actions/orders.ts.
-- SECURITY DEFINER : auth.uid() retourne l'UID du caller JWT.
-- Defense en profondeur : le server action verifie deja le role admin,
-- la BDD le confirme independamment.

CREATE OR REPLACE FUNCTION public.admin_confirm_order(
    p_order_id       UUID,
    p_tracking_number TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
    rows_affected INT;
    caller_role   TEXT;
BEGIN
    SELECT role INTO caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF COALESCE(caller_role, '') NOT IN ('admin') THEN
        RAISE EXCEPTION 'Acces refuse : role admin requis (role courant : %)',
            COALESCE(caller_role, 'inconnu');
    END IF;

    UPDATE public.orders
    SET
        status          = 'confirmed',
        tracking_number = p_tracking_number
    WHERE id     = p_order_id
      AND status = 'pending';

    GET DIAGNOSTICS rows_affected = ROW_COUNT;

    IF rows_affected = 0 THEN
        RETURN NULL;
    END IF;

    RETURN p_tracking_number;
END;
$body$;

COMMENT ON FUNCTION public.admin_confirm_order(UUID, TEXT) IS
    'Confirme atomiquement une commande (pending -> confirmed). Verifie en interne que l''appelant a le role admin.';

REVOKE ALL  ON FUNCTION public.admin_confirm_order(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_confirm_order(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_confirm_order(UUID, TEXT) TO service_role;


-- ===========================================================================
-- S3 : Politique RLS disputes
-- ===========================================================================
-- S3a : service_role_disputes restreinte au role service_role
-- (sans clause TO, la politique s'applique a tous les roles y compris anon)

DROP POLICY IF EXISTS "service_role_disputes" ON public.disputes;

CREATE POLICY "service_role_disputes" ON public.disputes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- S3b : SELECT pour les utilisateurs authentifies
-- Sans cette politique, getMyDisputes() et getDisputeByOrder() retournent 0 lignes.
-- L'acheteur voit ses litiges (user_id), le vendeur voit les litiges qui le concernent (seller_id).

DROP POLICY IF EXISTS "disputes_select_authenticated" ON public.disputes;

CREATE POLICY "disputes_select_authenticated" ON public.disputes
    FOR SELECT
    TO authenticated
    USING (
        user_id   = auth.uid()
        OR seller_id = auth.uid()
    );


-- ===========================================================================
-- S4 : Bucket vendor-verifications - passer en prive + politiques storage
-- ===========================================================================
-- VendorVerificationClient.tsx a ete mis a jour pour utiliser createSignedUrl
-- au lieu de getPublicUrl (URL signee 90 jours).

UPDATE storage.buckets
SET public = false
WHERE id   = 'vendor-verifications'
  AND public = true;

-- INSERT : le vendeur peut uploader dans son propre dossier
-- Chemin attendu : verifications/<user_id>/<timestamp>-id.<ext>

DROP POLICY IF EXISTS "vendor_verifications_insert_own" ON storage.objects;

CREATE POLICY "vendor_verifications_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'vendor-verifications'
    AND (storage.foldername(name))[1] = 'verifications'
    AND (storage.foldername(name))[2] = auth.uid()::text
);

-- UPDATE : pour upsert:true (re-soumission du formulaire de verification)

DROP POLICY IF EXISTS "vendor_verifications_update_own" ON storage.objects;

CREATE POLICY "vendor_verifications_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'vendor-verifications'
    AND (storage.foldername(name))[1] = 'verifications'
    AND (storage.foldername(name))[2] = auth.uid()::text
);

-- SELECT : le vendeur lit ses propres fichiers (pour generer des signed URLs),
-- les admins et comptables lisent tout (pour la review des dossiers).

DROP POLICY IF EXISTS "vendor_verifications_select_auth" ON storage.objects;

CREATE POLICY "vendor_verifications_select_auth"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'vendor-verifications'
    AND (
        (
            (storage.foldername(name))[1] = 'verifications'
            AND (storage.foldername(name))[2] = auth.uid()::text
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id   = auth.uid()
              AND role IN ('admin', 'comptable')
        )
    )
);


-- ===========================================================================
-- S5 : Trigger de protection des colonnes sensibles de profiles
-- ===========================================================================
-- Colonnes protegees : role, verification_status, is_suspended
--
-- Trois cas autorises :
--
-- Cas 1 - service_role : appels serveur internes (pas de JWT utilisateur).
--   Detection : JWT claims contient "role":"service_role".
--
-- Cas 2 - Vendeur soumettant sa verification :
--   submitVerification() fait UPDATE profiles SET verification_status='pending'.
--   Autorise si et seulement si :
--     * auth.uid() = NEW.id  (le vendeur modifie son propre profil)
--     * role et is_suspended ne changent pas
--     * NEW.verification_status = 'pending'
--     * OLD.verification_status est NULL, 'none' ou 'rejected'
--
-- Cas 3 - Admin authentifie via JWT :
--   SELECT role FROM profiles WHERE id = auth.uid() retourne 'admin'.

CREATE OR REPLACE FUNCTION public.protect_profiles_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
    caller_role    TEXT;
    jwt_role_claim TEXT;
BEGIN
    -- Sortir immediatement si aucune colonne sensible n'a change
    IF NOT (
        (NEW.role IS DISTINCT FROM OLD.role)
        OR (NEW.verification_status IS DISTINCT FROM OLD.verification_status)
        OR (NEW.is_suspended IS DISTINCT FROM OLD.is_suspended)
    ) THEN
        RETURN NEW;
    END IF;

    -- Cas 1 : service_role (appels serveur internes)
    jwt_role_claim := COALESCE(
        (current_setting('request.jwt.claims', true)::jsonb)->>'role',
        ''
    );
    IF jwt_role_claim = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Cas 2 : vendeur soumet sa propre verification (none/rejected -> pending uniquement)
    IF auth.uid() = NEW.id
        AND (NEW.role IS NOT DISTINCT FROM OLD.role)
        AND (NEW.is_suspended IS NOT DISTINCT FROM OLD.is_suspended)
        AND NEW.verification_status = 'pending'
        AND (
            OLD.verification_status IS NULL
            OR OLD.verification_status IN ('none', 'rejected')
        )
    THEN
        RETURN NEW;
    END IF;

    -- Cas 3 : admin authentifie via JWT
    SELECT role INTO caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF COALESCE(caller_role, '') = 'admin' THEN
        RETURN NEW;
    END IF;

    -- Tout autre cas : refus
    RAISE EXCEPTION
        'Modification refusee : role, verification_status et is_suspended sont reserves aux admins. (caller_role=%, jwt_role=%)',
        COALESCE(caller_role, 'null'),
        jwt_role_claim;
END;
$body$;

DROP TRIGGER IF EXISTS trg_protect_profiles_sensitive ON public.profiles;

CREATE TRIGGER trg_protect_profiles_sensitive
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profiles_sensitive_columns();

COMMENT ON FUNCTION public.protect_profiles_sensitive_columns() IS
    'Empeche tout utilisateur non-admin de modifier role, verification_status ou is_suspended. Exceptions : service_role (serveur), vendeur soumettant sa verification (none/rejected->pending).';


-- ===========================================================================
-- FACULTATIF : Politique UPDATE profiles (a appliquer si absente ou trop large)
-- ===========================================================================
-- Verifier d'abord avec :
--   SELECT policyname, cmd, roles, qual FROM pg_policies WHERE tablename = 'profiles';
-- Si la politique UPDATE n'existe pas ou permet a d'autres utilisateurs de modifier
-- le profil de quelqu'un d'autre, appliquer :

-- DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
-- CREATE POLICY "profiles_update_own" ON public.profiles
--     FOR UPDATE TO authenticated
--     USING  (id = auth.uid())
--     WITH CHECK (id = auth.uid());


-- ===========================================================================
-- REQUETES DE VERIFICATION AVANT APPLICATION (lecture seule)
-- ===========================================================================
-- Copier-coller chaque requete separement avant d'appliquer la migration.

-- 1. Politiques existantes sur profiles :
-- SELECT schemaname, tablename, policyname, cmd, roles, qual
-- FROM pg_policies WHERE tablename = 'profiles' ORDER BY policyname;

-- 2. Politiques existantes sur disputes :
-- SELECT schemaname, tablename, policyname, cmd, roles, qual
-- FROM pg_policies WHERE tablename = 'disputes' ORDER BY policyname;

-- 3. Statut du bucket vendor-verifications :
-- SELECT id, name, public FROM storage.buckets WHERE id = 'vendor-verifications';

-- 4. Politiques storage sur vendor-verifications :
-- SELECT policyname, definition FROM storage.policies
-- WHERE bucket_id = 'vendor-verifications';

-- 5. Trigger profiles :
-- SELECT trigger_name, event_manipulation FROM information_schema.triggers
-- WHERE trigger_name = 'trg_protect_profiles_sensitive';

-- 6. Fonction admin_confirm_order :
-- SELECT p.proname FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public' AND p.proname = 'admin_confirm_order';


-- ===========================================================================
-- VERIFICATIONS POST-MIGRATION
-- ===========================================================================
-- 1. admin_confirm_order bloque les non-admins (executer en tant que non-admin) :
--    SELECT public.admin_confirm_order('00000000-0000-0000-0000-000000000000', 'TEST');
--    -> doit lever "Acces refuse : role admin requis"
--
-- 2. disputes : un anon ne peut pas lire (executer en tant que anon) :
--    SELECT * FROM public.disputes LIMIT 1;
--    -> 0 lignes
--
-- 3. Bucket prive :
--    SELECT public FROM storage.buckets WHERE id = 'vendor-verifications';
--    -> false
--
-- 4. Trigger bloque l'elevation de role (executer en tant que non-admin) :
--    UPDATE public.profiles SET role = 'admin' WHERE id = auth.uid();
--    -> doit lever "Modification refusee : role..."
--
-- 5. Trigger autorise la soumission vendeur (executer en tant que vendeur) :
--    UPDATE public.profiles SET verification_status = 'pending' WHERE id = auth.uid();
--    -> doit reussir si l'ancien statut est NULL, 'none' ou 'rejected'
