-- ═══════════════════════════════════════════════════════════════════════════
-- Mayombe Market — Migration sécurité (audit Codex)
-- NE PAS APPLIQUER EN PRODUCTION SANS REVUE ET BACKUP
-- Tester sur staging en premier.
--
-- Exécuter d'abord les requêtes de vérification en bas de ce fichier.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── S2 : Vérification du rôle admin dans admin_confirm_order ───────────────
-- Un seul appelant dans le code : adminConfirmPayment() (app/actions/orders.ts).
-- Cette fonction est SECURITY DEFINER — auth.uid() retourne l'ID du caller JWT.
-- La vérification interne est une défense en profondeur : le server action
-- vérifie déjà le rôle, mais la BDD le confirme de façon indépendante.

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
    caller_role   TEXT;
BEGIN
    SELECT role INTO caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF COALESCE(caller_role, '') NOT IN ('admin') THEN
        RAISE EXCEPTION 'Accès refusé : rôle admin requis (rôle courant : %)', COALESCE(caller_role, 'inconnu');
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
$$;

COMMENT ON FUNCTION public.admin_confirm_order(UUID, TEXT) IS
    'Confirme atomiquement une commande (pending → confirmed). Vérifie en interne que l''appelant a le rôle admin.';

REVOKE ALL ON FUNCTION public.admin_confirm_order(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_confirm_order(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_confirm_order(UUID, TEXT) TO service_role;


-- ─── S3 : Politique disputes "service_role_disputes" ────────────────────────
-- La politique FOR ALL USING (true) sans clause TO s'applique à TOUS les rôles,
-- y compris anon. Elle doit être limitée au rôle service_role.
-- Le code (app/actions/disputes.ts) utilise déjà le client service_role pour
-- les opérations admin (svc()).

DROP POLICY IF EXISTS "service_role_disputes" ON public.disputes;

CREATE POLICY "service_role_disputes" ON public.disputes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- S3-bis : SELECT pour les acheteurs/vendeurs authentifiés
-- Sans cette politique, getMyDisputes() et getDisputeByOrder() retournent 0 lignes.
-- L'acheteur voit ses propres litiges (user_id), le vendeur voit les litiges
-- qui le concernent (seller_id).
DROP POLICY IF EXISTS "disputes_select_authenticated" ON public.disputes;

CREATE POLICY "disputes_select_authenticated" ON public.disputes
    FOR SELECT
    TO authenticated
    USING (
        user_id   = auth.uid()
        OR seller_id = auth.uid()
    );


-- ─── S4 : Bucket vendor-verifications — passer en privé ────────────────────
-- Vérifier d'abord le statut avec la requête de lecture en bas de ce fichier.
-- Si public = true, appliquer :

UPDATE storage.buckets
SET public = false
WHERE id     = 'vendor-verifications'
  AND public = true;

-- Politique INSERT : le vendeur peut uploader dans son propre dossier.
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

-- Politique UPDATE : pour upsert: true (réenvoi du formulaire)
DROP POLICY IF EXISTS "vendor_verifications_update_own" ON storage.objects;

CREATE POLICY "vendor_verifications_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'vendor-verifications'
    AND (storage.foldername(name))[1] = 'verifications'
    AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Politique SELECT : le vendeur accède à ses propres fichiers (pour signed URLs),
-- les admins et comptables accèdent à tous les fichiers (pour review).
DROP POLICY IF EXISTS "vendor_verifications_select_auth" ON storage.objects;

CREATE POLICY "vendor_verifications_select_auth"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'vendor-verifications'
    AND (
        -- Le vendeur lit ses propres fichiers
        (
            (storage.foldername(name))[1] = 'verifications'
            AND (storage.foldername(name))[2] = auth.uid()::text
        )
        OR
        -- Les admins et comptables lisent tout
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id   = auth.uid()
              AND role IN ('admin', 'comptable')
        )
    )
);


-- ─── S5 : Protéger les colonnes sensibles de la table profiles ─────────────
--
-- PROBLÈMES DU TRIGGER PRÉCÉDENT et corrections :
--
-- Problème A — submitVerification() (app/actions/verifications.ts:94) fait :
--   UPDATE profiles SET verification_status='pending' WHERE id=auth.uid()
--   Le caller est un vendeur (role='vendor'), pas admin → l'ancienne version bloquait.
--   CORRECTION : autoriser la transition none/rejected → pending si le vendeur
--   modifie uniquement son propre verification_status (pas role, pas is_suspended).
--
-- Problème B — Appels service_role (auth.uid()=null) :
--   COALESCE(null, '') <> 'admin' → exception même pour les appels serveur de confiance.
--   CORRECTION : détecter le rôle JWT et autoriser service_role à passer.
--
-- Problème C — adminApproveVerification / adminRejectVerification :
--   Ces fonctions appellent les RPCs approve_vendor_verification / reject_vendor_verification
--   qui sont SECURITY DEFINER. auth.uid() retourne toujours l'UID de l'admin (JWT claims
--   propagés dans le contexte de la transaction). Role = 'admin' → passe. ✓

CREATE OR REPLACE FUNCTION public.protect_profiles_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role    TEXT;
    jwt_role_claim TEXT;
BEGIN
    -- Sortir immédiatement si aucune colonne sensible n'a changé
    IF NOT (
        (NEW.role IS DISTINCT FROM OLD.role)
        OR (NEW.verification_status IS DISTINCT FROM OLD.verification_status)
        OR (NEW.is_suspended IS DISTINCT FROM OLD.is_suspended)
    ) THEN
        RETURN NEW;
    END IF;

    -- ── Cas 1 : service_role (appels serveur internes, pas de JWT utilisateur) ──
    -- current_setting('request.jwt.claims') = '{"role":"service_role",...}'
    jwt_role_claim := COALESCE(
        (current_setting('request.jwt.claims', true)::jsonb)->>'role',
        ''
    );
    IF jwt_role_claim = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- ── Cas 2 : vendeur soumet sa propre vérification ──────────────────────────
    -- Seule transition autorisée : verification_status ∈ {NULL, 'none', 'rejected'} → 'pending'
    -- Conditions cumulatives :
    --   • auth.uid() = NEW.id  (le vendeur modifie son propre profil)
    --   • role et is_suspended restent inchangés
    --   • NEW.verification_status = 'pending' (et OLD = null/none/rejected)
    IF auth.uid() = NEW.id
        AND (NEW.role IS NOT DISTINCT FROM OLD.role)
        AND (NEW.is_suspended IS NOT DISTINCT FROM OLD.is_suspended)
        AND NEW.verification_status = 'pending'
        AND (OLD.verification_status IS NULL
             OR OLD.verification_status IN ('none', 'rejected'))
    THEN
        RETURN NEW;
    END IF;

    -- ── Cas 3 : admin authentifié via JWT ──────────────────────────────────────
    SELECT role INTO caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF COALESCE(caller_role, '') = 'admin' THEN
        RETURN NEW;
    END IF;

    -- ── Tout autre cas → refus ─────────────────────────────────────────────────
    RAISE EXCEPTION
        'Modification refusée : role, verification_status et is_suspended sont réservés aux admins. (caller_role=%, jwt_role=%)',
        COALESCE(caller_role, 'null'),
        jwt_role_claim;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profiles_sensitive ON public.profiles;
CREATE TRIGGER trg_protect_profiles_sensitive
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profiles_sensitive_columns();

COMMENT ON FUNCTION public.protect_profiles_sensitive_columns() IS
    'Empêche tout utilisateur non-admin de modifier role, verification_status ou is_suspended. '
    'Exceptions : service_role (serveur), vendeur → pending (soumission vérification).';

-- Vérifier que la politique UPDATE sur profiles est bien restreinte au propriétaire.
-- Si elle n'existe pas ou est trop permissive, appliquer :
--
--   DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
--   CREATE POLICY "profiles_update_own" ON public.profiles
--       FOR UPDATE TO authenticated
--       USING  (id = auth.uid())
--       WITH CHECK (id = auth.uid());


-- ─── Requêtes de vérification AVANT application ────────────────────────────
-- Exécuter ces requêtes en lecture seule dans Supabase SQL Editor AVANT d'appliquer
-- cette migration, pour vérifier l'état actuel de la production.
--
-- 1. Politiques existantes sur profiles :
-- SELECT schemaname, tablename, policyname, cmd, roles, qual
-- FROM pg_policies WHERE tablename = 'profiles' ORDER BY policyname;
--
-- 2. Politiques existantes sur disputes :
-- SELECT schemaname, tablename, policyname, cmd, roles, qual
-- FROM pg_policies WHERE tablename = 'disputes' ORDER BY policyname;
--
-- 3. Statut du bucket vendor-verifications :
-- SELECT id, name, public FROM storage.buckets WHERE id = 'vendor-verifications';
--
-- 4. Politiques storage existantes sur vendor-verifications :
-- SELECT policyname, definition FROM storage.policies
-- WHERE bucket_id = 'vendor-verifications';
--
-- 5. Trigger profiles existant :
-- SELECT trigger_name, event_manipulation, action_statement
-- FROM information_schema.triggers
-- WHERE trigger_name = 'trg_protect_profiles_sensitive';
--
-- 6. Fonction admin_confirm_order existante :
-- SELECT p.proname, p.security_type, pg_get_functiondef(p.oid)
-- FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public' AND p.proname = 'admin_confirm_order';


-- ─── Vérifications POST-migration ──────────────────────────────────────────
-- Après application, tester :
--
-- 1. admin_confirm_order bloque les non-admins :
--    SELECT admin_confirm_order('00000000-0000-0000-0000-000000000000', 'TRK-TEST');
--    → doit lever "Accès refusé : rôle admin requis"
--    (exécuter en tant qu'utilisateur non-admin)
--
-- 2. disputes : un anon ne peut pas lire :
--    SELECT * FROM public.disputes LIMIT 1;
--    → 0 lignes (en tant que rôle anon)
--
-- 3. vendor-verifications est private :
--    SELECT public FROM storage.buckets WHERE id = 'vendor-verifications';
--    → false
--
-- 4. Trigger bloque l'élévation de rôle par un non-admin :
--    UPDATE public.profiles SET role = 'admin' WHERE id = auth.uid();
--    → doit lever "Modification refusée : role, verification_status et is_suspended…"
--
-- 5. Trigger autorise la soumission de vérification par un vendeur :
--    UPDATE public.profiles SET verification_status = 'pending' WHERE id = auth.uid();
--    → doit réussir si verification_status actuel est NULL/'none'/'rejected'
--    (exécuter en tant qu'utilisateur avec role='vendor')
