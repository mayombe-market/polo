-- ============================================================
-- Migration : archivage sécurisé des commandes
-- Remplace la suppression physique par un soft-delete réversible.
--
-- Prérequis : supabase-rls-policies.sql doit avoir été appliqué
-- (il crée la policy "Admin modifie commandes" déjà présente).
--
-- RÉEXÉCUTABLE SANS ERREUR (toutes les instructions sont idempotentes).
-- À appliquer manuellement dans Supabase SQL Editor.
-- ============================================================

-- ── 1. Colonnes d'archivage ─────────────────────────────────────────────────
-- IF NOT EXISTS : sûr à réexécuter
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS is_archived  BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS archived_at  TIMESTAMPTZ          DEFAULT NULL;

-- ── 2. Index partiel pour les requêtes courantes (commandes actives) ─────────
-- Les dashboards filtrent sur is_archived = FALSE — cet index accélère ces requêtes.
CREATE INDEX IF NOT EXISTS idx_orders_is_archived
    ON public.orders (is_archived);

-- ── 3. Commentaires de documentation ────────────────────────────────────────
COMMENT ON COLUMN public.orders.is_archived IS
    'TRUE = commande archivée (masquée des vues admin). Les données sont préservées. Réversible.';
COMMENT ON COLUMN public.orders.archived_at IS
    'Horodatage de l''archivage. NULL si la commande n''est pas archivée.';

-- ── 4. Vérification de la policy RLS existante ──────────────────────────────
-- La policy "Admin modifie commandes" (FOR UPDATE, rôle admin) couvre déjà
-- les nouvelles colonnes is_archived et archived_at : aucune policy supplémentaire
-- n'est nécessaire ni souhaitée.
--
-- Ce bloc vérifie que la policy requise est bien en place.
-- Si elle est absente, l'exécution s'arrête avec un message explicite.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'orders'
          AND policyname = 'Admin modifie commandes'
    ) THEN
        RAISE EXCEPTION
            'Prérequis manquant : la policy RLS "Admin modifie commandes" est absente. '
            'Appliquez supabase-rls-policies.sql avant de relancer cette migration.';
    END IF;

    -- Vérifier aussi que les vendeurs n'ont pas de policy UPDATE sur orders
    -- (protection contre une régression future)
    IF EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'orders'
          AND cmd        = 'UPDATE'
          AND policyname NOT IN ('Admin modifie commandes', 'Admin peut tout modifier')
    ) THEN
        RAISE WARNING
            'Attention : une policy UPDATE inattendue existe sur public.orders (%). '
            'Vérifiez qu''elle n''autorise pas les vendeurs à modifier is_archived.',
            (SELECT string_agg(policyname, ', ')
             FROM pg_policies
             WHERE schemaname = 'public'
               AND tablename  = 'orders'
               AND cmd        = 'UPDATE'
               AND policyname NOT IN ('Admin modifie commandes', 'Admin peut tout modifier'));
    END IF;
END;
$$;

-- ── 5. Récapitulatif des accès (lecture seule, documentation) ───────────────
-- Qui peut archiver une commande ?
--   → Uniquement les utilisateurs avec role = 'admin' dans profiles
--   → Via la policy existante "Admin modifie commandes"
-- Qui NE PEUT PAS archiver ?
--   → Les vendeurs (policy SELECT uniquement)
--   → Les acheteurs (policy SELECT sur leurs propres commandes uniquement)
--   → Les utilisateurs non connectés (RLS bloque)

-- ── 6. Requêtes utiles (commentées — ne s'exécutent pas) ────────────────────
-- Voir les commandes archivées :
--   SELECT id, tracking_number, customer_name, archived_at
--   FROM public.orders
--   WHERE is_archived = TRUE
--   ORDER BY archived_at DESC;
--
-- Restaurer une commande archivée (admin uniquement) :
--   UPDATE public.orders
--   SET is_archived = FALSE, archived_at = NULL
--   WHERE id = 'VOTRE-UUID-ICI';
--
-- Compter les commandes archivées :
--   SELECT COUNT(*) FROM public.orders WHERE is_archived = TRUE;
