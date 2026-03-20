-- ═══════════════════════════════════════════════════════════════════════════
-- Mayombe Market — RPC public.admin_reject_order
-- À exécuter dans Supabase : Dashboard → SQL Editor → New query → Coller → Run
--
-- Corrige : "Could not find the function public.admin_reject_order(...)"
-- ou erreurs de permission sur l’appel RPC depuis l’app (rôle authenticated).
--
-- Comportement : passe la commande de pending → rejected de façon atomique
-- (une seule ligne mise à jour si le statut est encore pending).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_reject_order(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    rows_affected INT;
BEGIN
    UPDATE public.orders
    SET status = 'rejected'
    WHERE id = p_order_id
      AND status = 'pending';

    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected > 0;
END;
$$;

COMMENT ON FUNCTION public.admin_reject_order(UUID) IS
    'Rejette atomiquement une commande (pending → rejected). Retourne true si une ligne a été mise à jour.';

REVOKE ALL ON FUNCTION public.admin_reject_order(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reject_order(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_order(UUID) TO service_role;
