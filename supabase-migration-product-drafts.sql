-- ============================================================
-- Migration : Produits en brouillon (is_draft)
-- Auteur     : Claude Code / gautierpolo@icloud.com
-- Usage      : Appliquer dans Supabase SQL Editor (staging d'abord)
--              Activer FEATURES.draftProducts = true après application
--
-- Contexte   : Permet aux vendeurs non vérifiés de créer / modifier
--              des produits en brouillon.
--              Les produits en brouillon ne sont pas visibles sur la
--              marketplace (filtrés par les politiques RLS et les requêtes).
-- ============================================================

-- 1. Ajouter la colonne is_draft sur la table products
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Index pour les requêtes marketplace (ne retourner que les produits publiés)
CREATE INDEX IF NOT EXISTS idx_products_is_draft
    ON products (is_draft)
    WHERE is_draft = FALSE;

-- 3. Politique RLS : les produits en brouillon ne sont visibles que par leur vendeur
--    (La politique publique SELECT doit exclure is_draft = true)
--    Note : cette politique modifie la politique SELECT existante.
--    Vérifier d'abord les politiques actives :
--      SELECT * FROM pg_policies WHERE tablename = 'products';
--
--    Si une politique "Anyone can read products" existe :
DROP POLICY IF EXISTS "Anyone can read products" ON products;

CREATE POLICY "Anyone can read published products"
    ON products FOR SELECT
    USING (
        is_draft = FALSE
        OR seller_id = auth.uid()
    );

-- 4. Politique RLS : un vendeur peut insérer un brouillon même non vérifié
--    (La publication finale est bloquée côté serveur : is_draft ne peut passer
--     à FALSE que si verification_status = 'verified')
DROP POLICY IF EXISTS "Vendors can insert products" ON products;

CREATE POLICY "Vendors can insert products"
    ON products FOR INSERT
    WITH CHECK (
        seller_id = auth.uid()
        AND (
            -- Produit en brouillon : autorisé pour tous les vendeurs
            is_draft = TRUE
            OR
            -- Publication : réservée aux vendeurs vérifiés
            EXISTS (
                SELECT 1 FROM profiles
                WHERE id = auth.uid()
                  AND verification_status = 'verified'
            )
        )
    );

-- 5. Politique RLS : un vendeur peut modifier ses propres produits
--    (UPDATE vers is_draft = FALSE requiert verification_status = 'verified')
DROP POLICY IF EXISTS "Vendors can update own products" ON products;

CREATE POLICY "Vendors can update own products"
    ON products FOR UPDATE
    USING (seller_id = auth.uid())
    WITH CHECK (
        seller_id = auth.uid()
        AND (
            -- Garder en brouillon ou modifier un brouillon : toujours autorisé
            is_draft = TRUE
            OR
            -- Publier (is_draft = FALSE) : vendeur vérifié requis
            EXISTS (
                SELECT 1 FROM profiles
                WHERE id = auth.uid()
                  AND verification_status = 'verified'
            )
        )
    );

-- ============================================================
-- Vérification post-migration
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'products' AND column_name = 'is_draft';
-- ============================================================
