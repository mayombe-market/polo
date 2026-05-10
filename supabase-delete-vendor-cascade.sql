-- ═══════════════════════════════════════════════════════════════════════════
-- admin_delete_vendor_cascade
-- À exécuter dans Supabase : SQL Editor → New query → Run
--
-- Supprime toutes les données liées à un vendeur dans le bon ordre
-- (respecte les contraintes FK) avant la suppression du compte auth.
-- Appelée par l'action adminDeleteVendor côté serveur.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_delete_vendor_cascade(p_vendor_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- ── Données vendeur ─────────────────────────────────────────────────────
    DELETE FROM public.products              WHERE seller_id  = p_vendor_id;
    DELETE FROM public.vendor_verifications  WHERE vendor_id  = p_vendor_id;
    DELETE FROM public.seller_follows        WHERE seller_id  = p_vendor_id;
    DELETE FROM public.vendor_ad_campaigns   WHERE user_id    = p_vendor_id;
    DELETE FROM public.hotel_review_requests WHERE hotel_id   = p_vendor_id;

    -- ── Avis / notes ────────────────────────────────────────────────────────
    DELETE FROM public.reviews WHERE seller_id    = p_vendor_id;
    DELETE FROM public.reviews WHERE reviewer_id  = p_vendor_id;
    DELETE FROM public.ratings WHERE seller_id    = p_vendor_id;
    DELETE FROM public.ratings WHERE reviewer_id  = p_vendor_id;

    -- ── Négociations ─────────────────────────────────────────────────────────
    DELETE FROM public.negotiations WHERE seller_id = p_vendor_id;
    DELETE FROM public.negotiations WHERE buyer_id  = p_vendor_id;

    -- ── Messages / conversations ─────────────────────────────────────────────
    DELETE FROM public.messages WHERE sender_id = p_vendor_id;
    DELETE FROM public.conversations
        WHERE seller_id = p_vendor_id OR buyer_id = p_vendor_id;

    -- ── Notifications / push ─────────────────────────────────────────────────
    DELETE FROM public.notifications    WHERE user_id = p_vendor_id;
    DELETE FROM public.push_subscriptions WHERE user_id = p_vendor_id;

    -- ── Fidélité ─────────────────────────────────────────────────────────────
    DELETE FROM public.loyalty_transactions WHERE user_id = p_vendor_id;
    DELETE FROM public.loyalty_accounts     WHERE user_id = p_vendor_id;

    -- ── Litiges / transferts ─────────────────────────────────────────────────
    DELETE FROM public.disputes      WHERE user_id = p_vendor_id;
    DELETE FROM public.bank_transfers WHERE user_id = p_vendor_id;

    -- ── Commandes : conserver l'historique financier mais détacher le user ───
    -- (orders.items est un JSONB — pas de FK ; on garde les lignes pour l'audit)
    UPDATE public.orders SET user_id = NULL
        WHERE user_id = p_vendor_id
          AND status IN ('pending', 'rejected');   -- seulement les non-finalisées

    -- ── Panier ──────────────────────────────────────────────────────────────
    DELETE FROM public.cart WHERE user_id = p_vendor_id;

    -- ── Profil (en dernier parmi les tables publiques) ───────────────────────
    DELETE FROM public.profiles WHERE id = p_vendor_id;

    -- La suppression du compte auth.users est faite côté JS après cet appel.
END;
$$;

-- Permissions
REVOKE ALL ON FUNCTION public.admin_delete_vendor_cascade(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_vendor_cascade(UUID) TO service_role;
