-- ============================================================
-- Migration : archivage sécurisé des commandes
-- Remplace la suppression physique par un soft-delete réversible.
--
-- À APPLIQUER MANUELLEMENT dans Supabase SQL Editor.
-- Tester sur staging avant production.
-- Date d'application : à renseigner
-- ============================================================

-- 1. Ajouter les colonnes d'archivage sur la table orders
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS is_archived   BOOLEAN     DEFAULT FALSE NOT NULL,
    ADD COLUMN IF NOT EXISTS archived_at   TIMESTAMPTZ DEFAULT NULL;

-- 2. Index pour filtrer les commandes non archivées efficacement
CREATE INDEX IF NOT EXISTS idx_orders_not_archived
    ON orders (is_archived)
    WHERE is_archived = FALSE;

-- 3. Mettre à jour la RLS policy admin pour autoriser le soft-delete
-- (L'admin peut UPDATE is_archived, mais pas DELETE)
DO $$
BEGIN
    -- Vérifier si une policy "admin_update_orders" existe déjà
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'orders' AND policyname = 'admin_can_archive_orders'
    ) THEN
        EXECUTE $$
            CREATE POLICY admin_can_archive_orders ON orders
                FOR UPDATE
                TO authenticated
                USING (
                    EXISTS (
                        SELECT 1 FROM profiles
                        WHERE profiles.id = auth.uid()
                        AND profiles.role = 'admin'
                    )
                )
                WITH CHECK (
                    EXISTS (
                        SELECT 1 FROM profiles
                        WHERE profiles.id = auth.uid()
                        AND profiles.role = 'admin'
                    )
                );
        $$;
    END IF;
END;
$$;

-- 4. Vérification : les commandes archivées restent dans la table
-- Pour voir les commandes archivées :
-- SELECT * FROM orders WHERE is_archived = TRUE ORDER BY archived_at DESC;
-- Pour restaurer une commande archivée :
-- UPDATE orders SET is_archived = FALSE, archived_at = NULL WHERE id = 'UUID';
