-- =============================================================================
-- MIGRATION : RPC agrégation analytics plateforme — Mayombe Market
-- Date       : 2026-10-10
-- Problème   : adminGetPlatformAnalytics (app/actions/admin.ts:491) charge jusqu'à
--              80 000 lignes depuis analytics_events pour agrégation JS côté serveur.
--              Ces fonctions déplacent l'agrégation côté PostgreSQL (~1-5 ms vs ~500 ms+).
-- Sécurité   : NE PAS appliquer en production sans autorisation.
--              Toutes les fonctions sont SECURITY DEFINER exécutées avec le rôle service_role.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Compteurs globaux analytics (unique visitors, shop_views, product_views, checkout_starts)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_analytics_summary(
    p_from timestamptz DEFAULT NULL
)
RETURNS TABLE (
    unique_visitors  bigint,
    shop_views       bigint,
    product_views    bigint,
    checkout_starts  bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        COUNT(DISTINCT session_id)                                           AS unique_visitors,
        COUNT(*) FILTER (WHERE event_type = 'shop_view')                     AS shop_views,
        COUNT(*) FILTER (WHERE event_type = 'product_view')                  AS product_views,
        COUNT(*) FILTER (WHERE event_type = 'checkout_start')                AS checkout_starts
    FROM analytics_events
    WHERE (p_from IS NULL OR created_at >= p_from);
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Répartition par source
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_analytics_by_source(
    p_from timestamptz DEFAULT NULL
)
RETURNS TABLE (
    source           text,
    visitors         bigint,
    shop_views       bigint,
    product_views    bigint,
    checkout_starts  bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        COALESCE(source, 'unknown')                                          AS source,
        COUNT(DISTINCT session_id)                                           AS visitors,
        COUNT(*) FILTER (WHERE event_type = 'shop_view')                     AS shop_views,
        COUNT(*) FILTER (WHERE event_type = 'product_view')                  AS product_views,
        COUNT(*) FILTER (WHERE event_type = 'checkout_start')                AS checkout_starts
    FROM analytics_events
    WHERE (p_from IS NULL OR created_at >= p_from)
    GROUP BY source
    ORDER BY visitors DESC;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Tendance journalière (visitors + orders)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_analytics_daily_trend(
    p_from timestamptz DEFAULT NULL
)
RETURNS TABLE (
    day       date,
    visitors  bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        created_at::date        AS day,
        COUNT(DISTINCT session_id) AS visitors
    FROM analytics_events
    WHERE (p_from IS NULL OR created_at >= p_from)
    GROUP BY created_at::date
    ORDER BY day;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Top 10 produits par vues + checkouts
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_analytics_top_products(
    p_from timestamptz DEFAULT NULL,
    p_limit int DEFAULT 10
)
RETURNS TABLE (
    product_id  uuid,
    views       bigint,
    checkouts   bigint,
    score       bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        product_id,
        COUNT(*) FILTER (WHERE event_type = 'product_view')   AS views,
        COUNT(*) FILTER (WHERE event_type = 'checkout_start') AS checkouts,
        COUNT(*) FILTER (WHERE event_type = 'product_view') +
            COUNT(*) FILTER (WHERE event_type = 'checkout_start') * 3 AS score
    FROM analytics_events
    WHERE product_id IS NOT NULL
      AND (p_from IS NULL OR created_at >= p_from)
    GROUP BY product_id
    ORDER BY score DESC
    LIMIT p_limit;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- UTILISATION (app/actions/admin.ts — à implémenter après validation migration)
-- ─────────────────────────────────────────────────────────────────────────────
-- Remplacer dans adminGetPlatformAnalytics :
--
--   const [summary, sourceBreakdown, dailyVisitors, topProductsRaw] = await Promise.all([
--     db.rpc('admin_analytics_summary', { p_from: from }),
--     db.rpc('admin_analytics_by_source', { p_from: from }),
--     db.rpc('admin_analytics_daily_trend', { p_from: from }),
--     db.rpc('admin_analytics_top_products', { p_from: from, p_limit: 10 }),
--   ])
--
-- Cela réduit le transfert réseau de ~80 000 lignes × 5 colonnes → 4 petits résultats agrégés.
-- Performance estimée : < 5 ms par RPC (index sur created_at) vs ~500 ms+ (scan JS-side).
-- =============================================================================
