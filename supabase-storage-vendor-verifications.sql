-- ═══════════════════════════════════════════════════════════════════════════
-- Storage : bucket vendor-verifications (KYC vendeur)
-- À exécuter dans Supabase → SQL Editor (débloque RLS « new row violates policy »)
--
-- Chemin côté app (VendorVerificationClient.tsx) :
--   verifications/{auth.uid()}/{timestamp}-shop.{ext}
--   verifications/{auth.uid()}/{timestamp}-cni.{ext}
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Bucket public (URLs utilisées avec getPublicUrl, comme pour products)
INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-verifications', 'vendor-verifications', true)
ON CONFLICT (id) DO NOTHING;

-- 2) Supprimer d’anciennes policies du même nom si vous ré-exécutez le script
DROP POLICY IF EXISTS "vendor_verifications_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "vendor_verifications_select_own" ON storage.objects;
DROP POLICY IF EXISTS "vendor_verifications_update_own" ON storage.objects;
DROP POLICY IF EXISTS "vendor_verifications_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "vendor_verifications_admin_select" ON storage.objects;
DROP POLICY IF EXISTS "vendor_verifications_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "vendor_verifications_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "vendor_verifications_admin_delete" ON storage.objects;

-- Segments du chemin : verifications / USER_ID / fichier
-- split_part(name, '/', 1) = 'verifications'
-- split_part(name, '/', 2) = UUID utilisateur (propriétaire)

-- ─── Utilisateur authentifié : écrire uniquement sous verifications/{son uid}/ ───
CREATE POLICY "vendor_verifications_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'vendor-verifications'
    AND split_part(name, '/', 1) = 'verifications'
    AND split_part(name, '/', 2) = auth.uid()::text
);

CREATE POLICY "vendor_verifications_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'vendor-verifications'
    AND split_part(name, '/', 1) = 'verifications'
    AND split_part(name, '/', 2) = auth.uid()::text
);

-- upsert: true → mise à jour d’un objet existant
CREATE POLICY "vendor_verifications_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'vendor-verifications'
    AND split_part(name, '/', 1) = 'verifications'
    AND split_part(name, '/', 2) = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'vendor-verifications'
    AND split_part(name, '/', 1) = 'verifications'
    AND split_part(name, '/', 2) = auth.uid()::text
);

CREATE POLICY "vendor_verifications_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'vendor-verifications'
    AND split_part(name, '/', 1) = 'verifications'
    AND split_part(name, '/', 2) = auth.uid()::text
);

-- ─── Admin : accès complet sur ce bucket (lecture des dossiers KYC, modération) ───
CREATE POLICY "vendor_verifications_admin_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'vendor-verifications'
    AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
    )
);

CREATE POLICY "vendor_verifications_admin_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'vendor-verifications'
    AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
    )
);

CREATE POLICY "vendor_verifications_admin_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'vendor-verifications'
    AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
    )
)
WITH CHECK (
    bucket_id = 'vendor-verifications'
    AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
    )
);

CREATE POLICY "vendor_verifications_admin_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'vendor-verifications'
    AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
    )
);
