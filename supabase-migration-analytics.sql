-- =============================================================================
-- MAYOMBE MARKET — MIGRATION ANALYTICS & ENGAGEMENT
-- Missions : 1 (stats boutique), 2 (origine visiteurs), 7 (avis vérifiés), 8 (ventes publiques)
-- =============================================================================
-- ⚠️  À appliquer en production AVANT de déployer le code correspondant.
-- Toutes les opérations sont idempotentes (IF NOT EXISTS / OR REPLACE).
-- =============================================================================

-- ─── 1. TABLE ÉVÉNEMENTS ANALYTICS ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics_events (
    id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_id  uuid        REFERENCES products(id) ON DELETE SET NULL,
    event_type  text        NOT NULL CHECK (event_type IN ('shop_view', 'product_view')),
    session_id  text        NOT NULL,
    source      text        NOT NULL DEFAULT 'direct',
    utm_source  text,
    utm_medium  text,
    utm_campaign text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_shop_date
    ON analytics_events (shop_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_product_date
    ON analytics_events (product_id, created_at DESC)
    WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_session_shop
    ON analytics_events (session_id, shop_id);

-- ─── 2. RLS ANALYTICS ────────────────────────────────────────────────────────

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- INSERT : ouvert à tous (anonymes inclus) — pas de données personnelles stockées
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

-- ─── 3. RPC : INCRÉMENTER VIEWS_COUNT ────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_product_views(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE products
    SET views_count = COALESCE(views_count, 0) + 1
    WHERE id = p_product_id;
END;
$$;

-- ─── 4. RPC : ANALYTICS AGRÉGÉES PAR SOURCE ──────────────────────────────────

CREATE OR REPLACE FUNCTION get_vendor_analytics_by_source(
    p_shop_id  uuid,
    p_from     timestamptz,
    p_to       timestamptz
)
RETURNS TABLE (
    source       text,
    shop_views   bigint,
    product_views bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT
        e.source,
        COUNT(*) FILTER (WHERE e.event_type = 'shop_view')    AS shop_views,
        COUNT(*) FILTER (WHERE e.event_type = 'product_view') AS product_views
    FROM analytics_events e
    WHERE e.shop_id = p_shop_id
      AND e.created_at >= p_from
      AND e.created_at <= p_to
    GROUP BY e.source
    ORDER BY shop_views DESC;
$$;

-- ─── 5. COLONNE VENDOR_REPLY SUR REVIEWS ─────────────────────────────────────

ALTER TABLE reviews
    ADD COLUMN IF NOT EXISTS vendor_reply     text,
    ADD COLUMN IF NOT EXISTS vendor_reply_at  timestamptz;

-- ─── 6. COLONNE CONFIRMED_SALES_COUNT SUR PRODUCTS ───────────────────────────

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS confirmed_sales_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_sales
    ON products (confirmed_sales_count DESC);

-- ─── 7. RPC : METTRE À JOUR LE COMPTEUR DE VENTES ────────────────────────────
-- Appelé lors de la confirmation d'une commande (admin / confirm_vendor_payment)

CREATE OR REPLACE FUNCTION increment_confirmed_sales(
    p_product_id uuid,
    p_quantity   integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE products
    SET confirmed_sales_count = COALESCE(confirmed_sales_count, 0) + p_quantity
    WHERE id = p_product_id;
END;
$$;

-- ─── 8. COLONNE CREATED_AT SUR FAVORITES (si absente) ────────────────────────

ALTER TABLE favorites
    ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- ─── 9. INDEX PERFORMANCE ─────────────────────────────────────────────────────

-- Commandes par vendeur + date (pour dashboard analytics)
CREATE INDEX IF NOT EXISTS idx_orders_seller_date
    ON orders (seller_id, created_at DESC);

-- Abonnés boutique par date
CREATE INDEX IF NOT EXISTS idx_seller_follows_date
    ON seller_follows (seller_id, created_at DESC);

-- Favoris par produit
CREATE INDEX IF NOT EXISTS idx_favorites_product
    ON favorites (product_id, created_at DESC);

-- =============================================================================
-- ACTIONS MANUELLES APRÈS MIGRATION :
-- 1. Déployer le code (Vercel)
-- 2. Les analytics se collectent dès le déploiement
-- 3. Les views_count existants sont conservés (colonne déjà en place)
-- 4. Les confirmed_sales_count restent à 0 pour les commandes passées
--    → Optionnel : les rétro-calculer avec un UPDATE :
--    UPDATE products p
--    SET confirmed_sales_count = (
--        SELECT COALESCE(SUM((item->>'quantity')::int), 0)
--        FROM orders o, jsonb_array_elements(o.items) AS item
--        WHERE o.status IN ('confirmed','shipped','delivered')
--          AND (item->>'id')::text = p.id::text
--    );
-- =============================================================================
