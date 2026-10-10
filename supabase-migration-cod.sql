-- =============================================================================
-- MAYOMBE MARKET — MIGRATION PAIEMENT À LA LIVRAISON (COD)
-- Prérequis : supabase-migration-LAUNCH-FINAL.sql, supabase-migration-analytics.sql
-- =============================================================================
-- ⚠️  À appliquer en production AVANT de déployer le code correspondant.
-- Toutes les opérations sont idempotentes (IF NOT EXISTS / OR REPLACE).
-- =============================================================================

-- ─── 1. COLONNES ORDERS : statut paiement + code livraison + réservation ──────

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS payment_status         text NOT NULL DEFAULT 'unpaid'
        CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    ADD COLUMN IF NOT EXISTS delivery_code          text,
    ADD COLUMN IF NOT EXISTS reservation_expires_at timestamptz,
    ADD COLUMN IF NOT EXISTS cod_accepted_at        timestamptz;

-- Index utile pour les recherches par code
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_delivery_code
    ON orders (delivery_code)
    WHERE delivery_code IS NOT NULL;

-- ─── 2. COLONNES PROFILES : préférences COD vendeur ──────────────────────────

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS accept_cod             boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS accept_pickup_payment  boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS cod_reservation_hours  smallint NOT NULL DEFAULT 24;

-- ─── 3. RPC : GÉNÉRER LE CODE DE LIVRAISON ───────────────────────────────────
-- Génère un code 6 caractères unique (idempotent si déjà généré).
-- Charset sans caractères ambigus : pas de 0, 1, O, I, L.

CREATE OR REPLACE FUNCTION generate_delivery_code(p_order_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_charset  text    := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    v_code     text    := '';
    v_existing text;
    v_attempts int     := 0;
    v_i        int;
BEGIN
    SELECT delivery_code INTO v_existing
    FROM orders WHERE id = p_order_id;

    IF v_existing IS NOT NULL THEN
        RETURN v_existing;
    END IF;

    LOOP
        v_code := '';
        FOR v_i IN 1..6 LOOP
            v_code := v_code || substr(
                v_charset,
                1 + floor(random() * length(v_charset))::int,
                1
            );
        END LOOP;

        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM orders
            WHERE delivery_code = v_code
              AND status NOT IN ('delivered', 'cancelled', 'rejected')
        );

        v_attempts := v_attempts + 1;
        IF v_attempts > 20 THEN EXIT; END IF;
    END LOOP;

    UPDATE orders SET delivery_code = v_code WHERE id = p_order_id;
    RETURN v_code;
END;
$$;

-- ─── 4. RPC : CONSOMMER LE CODE DE LIVRAISON (paiement + livraison) ──────────
-- Vérifie le code, le consomme (usage unique), met à jour payment_status.
-- Seule la server action (SECURITY DEFINER) peut l'appeler, pas le client.

CREATE OR REPLACE FUNCTION consume_delivery_code(
    p_order_id uuid,
    p_code     text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored_code text;
BEGIN
    SELECT delivery_code INTO v_stored_code
    FROM orders WHERE id = p_order_id FOR UPDATE;

    IF v_stored_code IS NULL THEN
        RETURN false;
    END IF;

    IF upper(v_stored_code) <> upper(trim(p_code)) THEN
        RETURN false;
    END IF;

    UPDATE orders
    SET delivery_code  = NULL,
        payment_status = 'paid'
    WHERE id = p_order_id;

    RETURN true;
END;
$$;

-- ─── 5. RPC : RESTAURER LE STOCK (commande COD rejetée / annulée) ─────────────
-- Incrémente le stock pour chaque article ayant `has_stock = true`.

CREATE OR REPLACE FUNCTION restore_order_stock(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item jsonb;
    v_pid  uuid;
    v_qty  int;
BEGIN
    FOR v_item IN
        SELECT jsonb_array_elements(items) FROM orders WHERE id = p_order_id
    LOOP
        BEGIN
            v_pid := (v_item->>'id')::uuid;
            v_qty := COALESCE((v_item->>'quantity')::int, 1);

            UPDATE products
            SET stock_quantity = stock_quantity + v_qty
            WHERE id = v_pid AND has_stock = true;
        EXCEPTION WHEN others THEN
            -- Ignorer les items dont l'id n'est pas un UUID valide (ex: subscription_*)
            NULL;
        END;
    END LOOP;
END;
$$;

-- ─── 6. RPC : VENDEUR ACCEPTE UNE COMMANDE COD ───────────────────────────────
-- Passe le statut de pending → confirmed pour les commandes COD.
-- Seuls les vendeurs avec des articles dans la commande peuvent appeler.

CREATE OR REPLACE FUNCTION vendor_accept_cod_order(
    p_order_id  uuid,
    p_vendor_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status text;
    v_has_items boolean;
BEGIN
    SELECT status INTO v_status
    FROM orders WHERE id = p_order_id FOR UPDATE;

    IF v_status IS NULL OR v_status <> 'pending' THEN
        RETURN false;
    END IF;

    -- Vérifier que le vendeur a bien des articles dans cette commande
    SELECT EXISTS (
        SELECT 1 FROM jsonb_array_elements(
            (SELECT items FROM orders WHERE id = p_order_id)
        ) AS item
        WHERE item->>'seller_id' = p_vendor_id::text
    ) INTO v_has_items;

    IF NOT v_has_items THEN
        RETURN false;
    END IF;

    UPDATE orders
    SET status         = 'confirmed',
        cod_accepted_at = now()
    WHERE id = p_order_id;

    RETURN true;
END;
$$;

-- ─── 7. MIGRER payment_status DES COMMANDES EXISTANTES ───────────────────────
-- Les commandes déjà livrées / confirmed avec cash → paid
-- Les commandes mobile_money confirmées → paid
-- Les commandes pending → unpaid (déjà la valeur par défaut)

UPDATE orders
SET payment_status = 'paid'
WHERE payment_status = 'unpaid'
  AND status IN ('delivered', 'confirmed', 'shipped')
  AND payment_method IN ('cash', 'mobile_money', 'airtel_money');

-- ─── 8. INDEX PERFORMANCE ─────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_orders_payment_status
    ON orders (payment_status)
    WHERE payment_status = 'unpaid';

CREATE INDEX IF NOT EXISTS idx_orders_cod_status
    ON orders (payment_method, status)
    WHERE payment_method = 'cash';

-- =============================================================================
-- ACTIONS MANUELLES APRÈS MIGRATION :
-- 1. Déployer le code (Vercel)
-- 2. Le delivery_code sera généré à la création des nouvelles commandes COD
-- 3. Les commandes COD existantes n'ont pas de delivery_code (NULL)
--    → Optionnel : rétro-générer avec : SELECT generate_delivery_code(id) FROM orders
--      WHERE payment_method = 'cash' AND status NOT IN ('delivered','cancelled','rejected')
--      AND delivery_code IS NULL;
-- =============================================================================
