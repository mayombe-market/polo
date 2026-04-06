-- Avis paiement côté acheteur (carte in-app, sans email/SMS) + RPC pour actions acheteur sous RLS.
-- Exécuter dans Supabase → SQL Editor.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_payment_notice_type text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_payment_notice_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_payment_notice_dismissed_at timestamptz;

COMMENT ON COLUMN orders.buyer_payment_notice_type IS 'invalid_code | partial_payment | no_payment | resend_code';

CREATE OR REPLACE FUNCTION public.buyer_dismiss_payment_notice(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE orders
  SET buyer_payment_notice_dismissed_at = now()
  WHERE id = p_order_id
    AND user_id = auth.uid()
    AND status = 'pending'
    AND buyer_payment_notice_type IS NOT NULL;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.buyer_update_pending_transaction_id(p_order_id uuid, p_raw text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits text;
BEGIN
  v_digits := regexp_replace(COALESCE(p_raw, ''), '\D', '', 'g');
  IF length(v_digits) <> 10 THEN
    RETURN json_build_object('ok', false, 'error', 'Le code doit contenir exactement 10 chiffres');
  END IF;
  UPDATE orders SET
    transaction_id = v_digits,
    buyer_payment_notice_type = NULL,
    buyer_payment_notice_at = NULL,
    buyer_payment_notice_dismissed_at = NULL,
    updated_at = now()
  WHERE id = p_order_id
    AND user_id = auth.uid()
    AND status = 'pending';
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Commande introuvable ou non modifiable');
  END IF;
  RETURN json_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.buyer_dismiss_payment_notice(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.buyer_update_pending_transaction_id(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buyer_dismiss_payment_notice(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buyer_update_pending_transaction_id(uuid, text) TO authenticated;
