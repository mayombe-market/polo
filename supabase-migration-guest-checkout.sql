-- =============================================================================
-- MIGRATION : Checkout invité + Google OAuth — Mayombe Market
-- Date       : 2026-10-11
-- Sécurité   : NE PAS appliquer en production sans autorisation.
--              Idempotent — sûr à ré-appliquer.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Rendre user_id nullable sur orders (pour les commandes invitées)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Colonnes commandes invitées
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS is_guest        BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS guest_token     TEXT,
    ADD COLUMN IF NOT EXISTS guest_claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Token unique par commande invitée
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_guest_token
    ON orders (guest_token)
    WHERE guest_token IS NOT NULL;

-- Lookup par téléphone (rate-limit + claim)
CREATE INDEX IF NOT EXISTS idx_orders_phone_guest
    ON orders (phone, is_guest, created_at DESC)
    WHERE is_guest = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Mise à jour des politiques RLS orders
-- ─────────────────────────────────────────────────────────────────────────────

-- INSERT : les invités passent via la fonction RPC SECURITY DEFINER ci-dessous
-- (RLS ne peut pas être NULL = auth.uid() — le service_role bypass RLS)

-- SELECT : l'acheteur connecté voit ses commandes ET les commandes qu'il a réclamées
DROP POLICY IF EXISTS "Acheteur voit ses commandes" ON orders;
CREATE POLICY "Acheteur voit ses commandes" ON orders
    FOR SELECT USING (
        auth.uid() = user_id
        OR auth.uid() = guest_claimed_by
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RPC : créer une commande invitée (SECURITY DEFINER — bypass RLS)
--    Appelée depuis une server action Next.js via le service_role.
--    Le service_role bypasse déjà RLS — cette RPC est utile si on veut
--    l'appeler depuis le client anon. Dans notre cas on utilise le service_role
--    depuis la server action, donc la RPC est optionnelle mais documentée ici.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RPC : récupérer une commande invitée par token (lecture sécurisée)
--    Utilisée par la page de suivi /order/[token] sans auth.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_order_by_guest_token(p_token text)
RETURNS TABLE (
    id              uuid,
    guest_token     text,
    status          text,
    total_amount    numeric,
    payment_method  text,
    delivery_mode   text,
    customer_name   text,
    city            text,
    district        text,
    items           jsonb,
    created_at      timestamptz,
    tracking_number text,
    delivery_code   text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        o.id,
        o.guest_token,
        o.status,
        o.total_amount,
        o.payment_method,
        o.delivery_mode,
        o.customer_name,
        o.city,
        o.district,
        o.items::jsonb,
        o.created_at,
        o.tracking_number,
        o.delivery_code
    FROM orders o
    WHERE o.guest_token = p_token
      AND o.is_guest = TRUE
    LIMIT 1;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RPC : réclamer les commandes invitées d'un téléphone après inscription
--    Lie les commandes invitées au compte créé, en vérifiant le numéro de tel.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION claim_guest_orders_by_phone(
    p_user_id  uuid,
    p_phone    text
)
RETURNS integer   -- nombre de commandes réclamées
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count integer;
BEGIN
    UPDATE orders
    SET guest_claimed_by = p_user_id,
        user_id          = p_user_id
    WHERE is_guest = TRUE
      AND guest_claimed_by IS NULL
      AND user_id IS NULL
      AND regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
      AND created_at > now() - interval '90 days';  -- sécurité : 90 jours max

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE ACTIVATION
-- Après application de cette migration :
-- 1. Activer FEATURES.guestCheckout = true dans lib/featureFlags.ts
-- 2. Configurer Google OAuth dans Supabase Dashboard →
--    Authentication → Providers → Google (Client ID + Secret requis)
-- 3. Ajouter l'URL de callback Google dans Google Cloud Console :
--    https://<your-project>.supabase.co/auth/v1/callback
-- =============================================================================
