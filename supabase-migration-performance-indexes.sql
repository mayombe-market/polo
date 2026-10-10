-- =============================================================================
-- MIGRATION : Index de performance — Mayombe Market
-- Date       : 2026-10-10
-- Sécurité   : Toutes les opérations sont idempotentes (CREATE … IF NOT EXISTS)
--              Sûr à ré-appliquer. N'applique PAS en production sans autorisation.
--
-- ORDRE D'APPLICATION :
--   1. Ce fichier est AUTO-SUFFISANT pour la table analytics_events.
--      Il crée la table si elle n'existe pas encore, puis ajoute les index.
--   2. Si supabase-migration-analytics.sql a déjà été appliqué, les CREATE
--      TABLE / ALTER TABLE ci-dessous sont des no-ops (IF NOT EXISTS / IF NOT EXISTS).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. analytics_events — Création de la table si elle n'existe pas
--    (idempotent — no-op si déjà créée par supabase-migration-analytics.sql)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
    id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_id   uuid        REFERENCES products(id) ON DELETE SET NULL,
    event_type   text        NOT NULL,
    session_id   text        NOT NULL,
    source       text        NOT NULL DEFAULT 'direct',
    utm_source   text,
    utm_medium   text,
    utm_campaign text,
    created_at   timestamptz NOT NULL DEFAULT now()
);

-- Ajouter checkout_start à la contrainte si elle existe et ne le contient pas déjà.
-- On recrée la contrainte uniquement si elle ne contient pas 'checkout_start'.
DO $$
BEGIN
    -- Supprime l'ancienne contrainte CHECK restrictive si elle bloque checkout_start
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'analytics_events_event_type_check'
          AND conrelid = 'analytics_events'::regclass
    ) THEN
        -- Vérifie si checkout_start est déjà autorisé
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'analytics_events_event_type_check'
              AND conrelid = 'analytics_events'::regclass
              AND pg_get_constraintdef(oid) LIKE '%checkout_start%'
        ) THEN
            ALTER TABLE analytics_events DROP CONSTRAINT analytics_events_event_type_check;
            ALTER TABLE analytics_events
                ADD CONSTRAINT analytics_events_event_type_check
                CHECK (event_type IN ('shop_view', 'product_view', 'checkout_start'));
        END IF;
    END IF;
END $$;

-- RLS (no-op si déjà activé)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- INSERT : ouvert à tous (anonymes inclus — pas de données personnelles)
DROP POLICY IF EXISTS "analytics_insert_all" ON analytics_events;
CREATE POLICY "analytics_insert_all" ON analytics_events
    FOR INSERT WITH CHECK (true);

-- SELECT : vendeur voit ses propres données, admin voit tout
DROP POLICY IF EXISTS "analytics_select_owner" ON analytics_events;
CREATE POLICY "analytics_select_owner" ON analytics_events
    FOR SELECT USING (
        auth.uid() = shop_id
        OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. analytics_events — Index supplémentaires (hot paths non couverts)
--    Les 3 index existants (idx_analytics_shop_date, idx_analytics_product_date,
--    idx_analytics_session_shop) restent en place — on en ajoute 3 nouveaux.
-- ─────────────────────────────────────────────────────────────────────────────

-- Déduplication trackEvent : session_id + shop_id + event_type + created_at
CREATE INDEX IF NOT EXISTS idx_analytics_dedup
    ON analytics_events (session_id, shop_id, event_type, created_at DESC);

-- Rate-limit trackEvent : session_id + created_at
CREATE INDEX IF NOT EXISTS idx_analytics_session_date
    ON analytics_events (session_id, created_at DESC);

-- Admin platform analytics : scan par période (created_at >= ?)
CREATE INDEX IF NOT EXISTS idx_analytics_created_at
    ON analytics_events (created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. favorites — LikeButton (user_id + product_id)
--    L'index existant (product_id, created_at DESC) ne couvre pas user_id.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_user_product
    ON favorites (user_id, product_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. orders — Patterns fréquents non couverts
-- ─────────────────────────────────────────────────────────────────────────────

-- Liste commandes d'un acheteur : user_id + created_at DESC
CREATE INDEX IF NOT EXISTS idx_orders_user_date
    ON orders (user_id, created_at DESC);

-- Vérification de doublon par transaction_id
CREATE INDEX IF NOT EXISTS idx_orders_transaction_id
    ON orders (transaction_id)
    WHERE transaction_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. profiles — Listings admin filtrés par rôle + date
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_role_date
    ON profiles (role, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. products — Patterns marketplace
-- ─────────────────────────────────────────────────────────────────────────────

-- Nouveaux produits (ORDER BY created_at DESC)
CREATE INDEX IF NOT EXISTS idx_products_created_at
    ON products (created_at DESC);

-- Produits d'un vendeur
CREATE INDEX IF NOT EXISTS idx_products_seller_id
    ON products (seller_id, created_at DESC);

-- Produits en promo actifs
CREATE INDEX IF NOT EXISTS idx_products_promo_active
    ON products (promo_end_date DESC, promo_percentage)
    WHERE promo_percentage > 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. reviews — Filtrage par rating (page d'accueil)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reviews_rating_date
    ON reviews (rating, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE : admin_get_platform_analytics (app/actions/admin.ts:491)
-- Charge jusqu'à 80 000 lignes pour agrégation JS. À volume élevé, appliquer
-- supabase-migration-analytics-rpc.sql pour déplacer l'agrégation côté DB.
-- L'index idx_analytics_created_at (section 1) réduit déjà le coût du scan.
-- ─────────────────────────────────────────────────────────────────────────────
