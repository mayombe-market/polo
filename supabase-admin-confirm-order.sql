-- ═══════════════════════════════════════════════════════════════════════════
-- Mayombe Market — RPC admin_confirm_order
-- À exécuter dans Supabase : SQL Editor → New query → Coller → Run
--
-- Corrige : "Could not find the function public.admin_confirm_order(...)"
-- si la fonction n’existait pas ou n’était pas exposée à PostgREST.
-- ═══════════════════════════════════════════════════════════════════════════

-- Signature attendue par le client : p_order_id (uuid), p_tracking_number (text)
CREATE OR REPLACE FUNCTION public.admin_confirm_order(
    p_order_id UUID,
    p_tracking_number TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    rows_affected INT;
BEGIN
    UPDATE public.orders
    SET
        status = 'confirmed',
        tracking_number = p_tracking_number
    WHERE id = p_order_id
      AND status = 'pending';

    GET DIAGNOSTICS rows_affected = ROW_COUNT;

    IF rows_affected = 0 THEN
        RETURN NULL;
    END IF;

    RETURN p_tracking_number;
END;
$$;

COMMENT ON FUNCTION public.admin_confirm_order(UUID, TEXT) IS
    'Confirme atomiquement une commande (pending → confirmed) et enregistre le numéro de suivi.';

-- PostgREST / supabase-js : le rôle « authenticated » doit pouvoir appeler la RPC
-- (l’app vérifie déjà le rôle admin côté serveur avant d’appeler).
REVOKE ALL ON FUNCTION public.admin_confirm_order(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_confirm_order(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_confirm_order(UUID, TEXT) TO service_role;
