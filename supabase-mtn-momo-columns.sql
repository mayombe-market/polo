-- ═══════════════════════════════════════════════════════════════════════════
-- Mayombe Market — MTN MoMo : colonnes de traçabilité sur orders
-- À exécuter dans Supabase : SQL Editor → New query → Coller → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- Colonnes de traçabilité MTN MoMo
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS mtn_reference_id   TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS mtn_transaction_id TEXT DEFAULT NULL;

COMMENT ON COLUMN public.orders.mtn_reference_id   IS 'UUID généré côté serveur, envoyé à MTN en X-Reference-Id';
COMMENT ON COLUMN public.orders.mtn_transaction_id IS 'financialTransactionId retourné par MTN après paiement réussi';

-- Index pour lookup rapide depuis le webhook
CREATE INDEX IF NOT EXISTS idx_orders_mtn_reference_id
    ON public.orders (mtn_reference_id)
    WHERE mtn_reference_id IS NOT NULL;

-- ─── RPC : auto-confirmer une commande MTN MoMo ────────────────────────────
-- Appelée depuis le webhook et le polling status côté serveur.
-- Génère un tracking number et confirme atomiquement.
CREATE OR REPLACE FUNCTION public.mtn_auto_confirm_order(
    p_order_id          UUID,
    p_tracking_number   TEXT,
    p_mtn_transaction_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    rows_affected INT;
BEGIN
    UPDATE public.orders
    SET
        status              = 'confirmed',
        tracking_number     = p_tracking_number,
        confirmed_at        = NOW(),
        mtn_transaction_id  = COALESCE(p_mtn_transaction_id, mtn_transaction_id)
    WHERE id     = p_order_id
      AND status = 'pending';

    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected > 0;
END;
$$;

COMMENT ON FUNCTION public.mtn_auto_confirm_order(UUID, TEXT, TEXT) IS
    'Auto-confirme une commande MTN MoMo (pending → confirmed) avec tracking number.';

REVOKE ALL ON FUNCTION public.mtn_auto_confirm_order(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mtn_auto_confirm_order(UUID, TEXT, TEXT) TO service_role;
