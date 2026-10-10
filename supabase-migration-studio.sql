-- ============================================================
-- Migration : Studio Photo + Guide des tailles
-- À appliquer en production après autorisation
-- Toutes les opérations sont idempotentes
-- ============================================================

-- 1. Colonne dédiée pour le guide des tailles (évite la pollution de listing_extras)
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS size_guide jsonb DEFAULT '{}';

-- 2. Colonne pour les dimensions réelles du produit
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS product_dimensions jsonb DEFAULT '{}';

-- 3. Colonne pour les annotations du studio photo (permet la re-édition)
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS photo_studio jsonb DEFAULT '{}';

-- 4. Index GIN sur size_guide pour les requêtes futures (recherche par guide)
CREATE INDEX IF NOT EXISTS idx_products_size_guide
    ON products USING GIN (size_guide);

-- 5. Commentaires
COMMENT ON COLUMN products.size_guide IS
    'Guide des tailles : { "XS": { "chest": "82", "waist": "64", "hips": "88", "length": "60" }, ... }';

COMMENT ON COLUMN products.product_dimensions IS
    'Dimensions physiques réelles du produit : { "width": { "value": 30, "unit": "cm" }, "height": { "value": 45, "unit": "cm" } }';

COMMENT ON COLUMN products.photo_studio IS
    'État du studio photo : { "rotation": 0, "annotations": [...], "cropApplied": false }';

-- 6. Politiques RLS — le vendeur ne peut modifier que ses propres produits (déjà couvert par la politique existante)
-- Aucune nouvelle politique RLS requise : les colonnes héritent automatiquement des politiques UPDATE/SELECT existantes sur products.

-- ============================================================
-- Migration Supabase Storage (si images stockées dans Supabase)
-- NOTE : L'architecture actuelle utilise Cloudinary pour les images.
-- Ce bloc est préparé pour une migration future vers Supabase Storage.
-- ============================================================
/*
-- Créer un bucket pour les photos de studio
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-studio',
    'product-studio',
    true,
    10485760,  -- 10 Mo max
    ARRAY['image/webp', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Politique : lecture publique
CREATE POLICY "Studio photos are public" ON storage.objects
    FOR SELECT USING (bucket_id = 'product-studio');

-- Politique : upload uniquement par le propriétaire du produit
CREATE POLICY "Vendor can upload studio photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'product-studio'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Politique : suppression uniquement par le propriétaire
CREATE POLICY "Vendor can delete own studio photos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'product-studio'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
*/
