-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION : behavior_events — suivi comportemental plateforme
-- À appliquer sur Supabase Production après validation.
-- IDEMPOTENT : peut être relancé sans risque.
-- ═══════════════════════════════════════════════════════════════════════════
-- Cette table complète analytics_events (vues boutique/produit) en capturant
-- les événements plateforme : ajout panier, checkout, commandes, inscription
-- vendeur, vérification, etc.
-- shop_id nullable → permet les événements sans shop (inscription, erreurs…)
-- metadata JSONB   → données contextuelles flexibles (étape, erreur…)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS behavior_events (
    id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id   text        NOT NULL,
    event_type   text        NOT NULL,
    user_id      uuid        REFERENCES profiles(id) ON DELETE SET NULL,
    user_type    text        NOT NULL DEFAULT 'anonymous',
    -- 'connected' | 'guest' | 'anonymous'
    shop_id      uuid        REFERENCES profiles(id) ON DELETE SET NULL,
    product_id   uuid        REFERENCES products(id) ON DELETE SET NULL,
    source       text        NOT NULL DEFAULT 'direct',
    metadata     jsonb,
    created_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── Index ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS behavior_events_event_type_idx
    ON behavior_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS behavior_events_session_idx
    ON behavior_events (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS behavior_events_created_at_idx
    ON behavior_events (created_at DESC);

CREATE INDEX IF NOT EXISTS behavior_events_shop_id_idx
    ON behavior_events (shop_id, created_at DESC)
    WHERE shop_id IS NOT NULL;

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE behavior_events ENABLE ROW LEVEL SECURITY;

-- INSERT : ouvert à tous (données anonymes, pas de PII)
DROP POLICY IF EXISTS "behavior_events_insert_all" ON behavior_events;
CREATE POLICY "behavior_events_insert_all" ON behavior_events
    FOR INSERT WITH CHECK (true);

-- SELECT : service_role uniquement (admin)
DROP POLICY IF EXISTS "behavior_events_select_admin" ON behavior_events;
CREATE POLICY "behavior_events_select_admin" ON behavior_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
