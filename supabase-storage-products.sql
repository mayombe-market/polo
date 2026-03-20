-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ Script unique recommandé : supabase-vendors-storage-and-profiles-unlock.sql
--    (products + vendor-verifications + profiles + RLS products en une exécution)
--
-- Mayombe Market — Bucket Storage « products » + RLS table public.products
-- À exécuter dans Supabase → SQL Editor (Run) — idempotent, réexécutable
--
-- Chemins d’upload dans le code :
--   • Vendeur (AddProductForm) : {auth.uid()}/{timestamp-uuid}-main.ext
--   • Admin (admin/products)   : product-images/{random}.ext
--
-- Note : l’app Next.js ne peut pas « au démarrage » créer le bucket ; ce bloc
-- vérifie en SQL que le bucket existe et le crée avant de recréer les policies.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1) Bucket : existence contrôlée + création préventive ──────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'products') THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('products', 'products', true);
        RAISE NOTICE '[Mayombe Market] Bucket « products » créé (public).';
    ELSE
        RAISE NOTICE '[Mayombe Market] Bucket « products » déjà présent — policies RLS réappliquées.';
    END IF;
END $$;

-- Filet de sécurité si le DO n’a pas tourné (ex. conflit de transaction)
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- ─── 2) Policies storage.objects — bucket « products » ─────────────────────
DROP POLICY IF EXISTS "products_vendor_insert" ON storage.objects;
DROP POLICY IF EXISTS "products_vendor_select_own" ON storage.objects;
DROP POLICY IF EXISTS "products_vendor_update_own" ON storage.objects;
DROP POLICY IF EXISTS "products_vendor_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "products_public_read" ON storage.objects;
DROP POLICY IF EXISTS "products_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "products_admin_select" ON storage.objects;
DROP POLICY IF EXISTS "products_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "products_admin_delete" ON storage.objects;

-- Lecture publique (images catalogue + getPublicUrl)
CREATE POLICY "products_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

-- Vendeur : écriture uniquement dans son dossier (1er segment = UUID utilisateur)
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

-- Admin : accès complet sur ce bucket (ex. product-images/…)
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

-- ─── 3) Table public.products — INSERT vendeur + UPDATE avec WITH CHECK ────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendeur insère ses produits" ON public.products;
CREATE POLICY "Vendeur insère ses produits" ON public.products
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = seller_id
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'vendor'
        )
    );

DROP POLICY IF EXISTS "Vendeur modifie ses produits" ON public.products;
CREATE POLICY "Vendeur modifie ses produits" ON public.products
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = seller_id)
    WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Admin insère produits" ON public.products;
CREATE POLICY "Admin insère produits" ON public.products
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

DROP POLICY IF EXISTS "Admin modifie tous les produits" ON public.products;
CREATE POLICY "Admin modifie tous les produits" ON public.products
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
    WITH CHECK (true);

DROP POLICY IF EXISTS "Produits visibles par tous" ON public.products;
CREATE POLICY "Produits visibles par tous" ON public.products
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Vendeur ou admin supprime produit" ON public.products;
CREATE POLICY "Vendeur ou admin supprime produit" ON public.products
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() = seller_id
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
