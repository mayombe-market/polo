-- ═══════════════════════════════════════════════════════════════════════════
-- Mayombe Market — SCRIPT UNIQUE : Storage (products + vendor-verifications)
--                     + colonnes profiles boutique + RLS table products
--
-- Exécuter UNE FOIS dans Supabase → SQL Editor → Run (idempotent).
-- Débloque uploads vendeur :
--   • products        → chemin {auth.uid()}/…  (AddProductForm)
--   • vendor-verifications → chemin verifications/{auth.uid()}/… (KYC)
--
-- Les anciens scripts séparés restent valides mais ce fichier les remplace.
--
-- Limite taille par fichier sur le bucket : voir `supabase-storage-products-bucket-limit.sql`
-- si le Dashboard a fixé un file_size_limit trop bas.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── A) Buckets ────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'products') THEN
        INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true);
        RAISE NOTICE '[Mayombe] Bucket products créé.';
    ELSE
        RAISE NOTICE '[Mayombe] Bucket products OK.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'vendor-verifications') THEN
        INSERT INTO storage.buckets (id, name, public) VALUES ('vendor-verifications', 'vendor-verifications', true);
        RAISE NOTICE '[Mayombe] Bucket vendor-verifications créé.';
    ELSE
        RAISE NOTICE '[Mayombe] Bucket vendor-verifications OK.';
    END IF;
END $$;

INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('vendor-verifications', 'vendor-verifications', true)
ON CONFLICT (id) DO NOTHING;

-- ─── B) Supprimer les policies Storage existantes (évite doublons / conflits) ─
-- products
DROP POLICY IF EXISTS "products_public_read" ON storage.objects;
DROP POLICY IF EXISTS "products_vendor_insert" ON storage.objects;
DROP POLICY IF EXISTS "products_vendor_update_own" ON storage.objects;
DROP POLICY IF EXISTS "products_vendor_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "products_vendor_select_own" ON storage.objects;
DROP POLICY IF EXISTS "products_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "products_admin_select" ON storage.objects;
DROP POLICY IF EXISTS "products_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "products_admin_delete" ON storage.objects;
-- vendor-verifications
DROP POLICY IF EXISTS "vendor_verifications_public_read" ON storage.objects;
DROP POLICY IF EXISTS "vendor_verifications_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "vendor_verifications_select_own" ON storage.objects;
DROP POLICY IF EXISTS "vendor_verifications_update_own" ON storage.objects;
DROP POLICY IF EXISTS "vendor_verifications_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "vendor_verifications_admin_select" ON storage.objects;
DROP POLICY IF EXISTS "vendor_verifications_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "vendor_verifications_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "vendor_verifications_admin_delete" ON storage.objects;

-- ─── C) Bucket products — lecture publique + vendeur dans {uid}/* + admin ────
CREATE POLICY "products_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

CREATE POLICY "products_vendor_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'products'
    AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "products_vendor_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'products'
    AND split_part(name, '/', 1) = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'products'
    AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "products_vendor_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'products'
    AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "products_admin_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'products'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

CREATE POLICY "products_admin_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'products'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
)
WITH CHECK (
    bucket_id = 'products'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

CREATE POLICY "products_admin_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'products'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ─── D) Bucket vendor-verifications — verifications/{uid}/* + lecture publique + admin
CREATE POLICY "vendor_verifications_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'vendor-verifications');

CREATE POLICY "vendor_verifications_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'vendor-verifications'
    AND split_part(name, '/', 1) = 'verifications'
    AND split_part(name, '/', 2) = auth.uid()::text
);

CREATE POLICY "vendor_verifications_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'vendor-verifications'
    AND split_part(name, '/', 1) = 'verifications'
    AND split_part(name, '/', 2) = auth.uid()::text
);

CREATE POLICY "vendor_verifications_update_own"
ON storage.objects FOR UPDATE TO authenticated
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
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'vendor-verifications'
    AND split_part(name, '/', 1) = 'verifications'
    AND split_part(name, '/', 2) = auth.uid()::text
);

CREATE POLICY "vendor_verifications_admin_select"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'vendor-verifications'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

CREATE POLICY "vendor_verifications_admin_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'vendor-verifications'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

CREATE POLICY "vendor_verifications_admin_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'vendor-verifications'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
)
WITH CHECK (
    bucket_id = 'vendor-verifications'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

CREATE POLICY "vendor_verifications_admin_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'vendor-verifications'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ─── E) Table public.products — RLS vendeur / admin / lecture ───────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendeur insère ses produits" ON public.products;
CREATE POLICY "Vendeur insère ses produits" ON public.products
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = seller_id
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'vendor'
        )
    );

DROP POLICY IF EXISTS "Vendeur modifie ses produits" ON public.products;
CREATE POLICY "Vendeur modifie ses produits" ON public.products
    FOR UPDATE TO authenticated
    USING (auth.uid() = seller_id)
    WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Admin insère produits" ON public.products;
CREATE POLICY "Admin insère produits" ON public.products
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

DROP POLICY IF EXISTS "Admin modifie tous les produits" ON public.products;
CREATE POLICY "Admin modifie tous les produits" ON public.products
    FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
    WITH CHECK (true);

DROP POLICY IF EXISTS "Produits visibles par tous" ON public.products;
CREATE POLICY "Produits visibles par tous" ON public.products
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Vendeur ou admin supprime produit" ON public.products;
CREATE POLICY "Vendeur ou admin supprime produit" ON public.products
    FOR DELETE TO authenticated
    USING (
        auth.uid() = seller_id
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- ─── F) Colonnes profiles (shop_*) — évite erreurs si trigger / code les utilise
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shop_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shop_category TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shop_description TEXT;

DO $$
BEGIN
    RAISE NOTICE '[Mayombe] Script terminé : storage products + vendor-verifications, products RLS, colonnes profiles.';
END $$;
