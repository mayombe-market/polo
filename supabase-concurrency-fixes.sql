-- ═══════════════════════════════════════════════════════════
-- Mayombe Market — Concurrency Fixes
-- Exécuter dans Supabase SQL Editor (une seule fois)
-- ═══════════════════════════════════════════════════════════

-- ═══ 1. RPC ATOMIQUE POUR DÉCRÉMENTATION DE STOCK ═══
-- Empêche le stock négatif même avec 100 acheteurs simultanés
-- Le WHERE stock_quantity >= p_quantity est la clé : PostgreSQL verrouille
-- la ligne pendant l'UPDATE, donc un seul acheteur peut gagner.

CREATE OR REPLACE FUNCTION decrement_stock(
    p_product_id UUID,
    p_quantity INT
) RETURNS BOOLEAN AS $$
DECLARE
    rows_affected INT;
BEGIN
    UPDATE products
    SET stock_quantity = stock_quantity - p_quantity,
        has_stock = CASE WHEN stock_quantity - p_quantity > 0 THEN true ELSE false END
    WHERE id = p_product_id
      AND has_stock = true
      AND stock_quantity >= p_quantity;

    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══ 2. RPC ATOMIQUE POUR CONFIRMATION DE PAIEMENT ═══
-- Verrou optimiste : confirme SEULEMENT si le statut est encore 'pending'
-- Retourne le tracking_number généré, ou NULL si déjà confirmé

CREATE OR REPLACE FUNCTION admin_confirm_order(
    p_order_id UUID,
    p_tracking_number TEXT
) RETURNS TEXT AS $$
DECLARE
    rows_affected INT;
BEGIN
    UPDATE orders
    SET status = 'confirmed',
        tracking_number = p_tracking_number
    WHERE id = p_order_id
      AND status = 'pending';

    GET DIAGNOSTICS rows_affected = ROW_COUNT;

    IF rows_affected = 0 THEN
        RETURN NULL;
    END IF;

    RETURN p_tracking_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══ 3. RPC ATOMIQUE POUR REJET DE COMMANDE ═══

CREATE OR REPLACE FUNCTION admin_reject_order(
    p_order_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    rows_affected INT;
BEGIN
    UPDATE orders
    SET status = 'rejected'
    WHERE id = p_order_id
      AND status = 'pending';

    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══ 4. RPC ATOMIQUE POUR LIBÉRATION DES FONDS ═══
-- Vérifie delivered + payout_status = pending + 48h en une seule opération

CREATE OR REPLACE FUNCTION admin_release_funds(
    p_order_id UUID
) RETURNS TEXT AS $$
DECLARE
    v_order RECORD;
    v_elapsed INTERVAL;
BEGIN
    SELECT status, payout_status, delivered_at
    INTO v_order
    FROM orders
    WHERE id = p_order_id
    FOR UPDATE;  -- Verrouille la ligne

    IF NOT FOUND THEN
        RETURN 'Commande introuvable';
    END IF;

    IF v_order.status != 'delivered' THEN
        RETURN 'Commande non livrée';
    END IF;

    IF v_order.payout_status != 'pending' THEN
        RETURN 'Fonds déjà libérés';
    END IF;

    IF v_order.delivered_at IS NOT NULL THEN
        v_elapsed := NOW() - v_order.delivered_at;
        IF v_elapsed < INTERVAL '48 hours' THEN
            RETURN 'Il faut attendre 48h après la livraison';
        END IF;
    END IF;

    UPDATE orders
    SET payout_status = 'paid'
    WHERE id = p_order_id;

    RETURN 'OK';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
