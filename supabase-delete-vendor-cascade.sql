-- ═══════════════════════════════════════════════════════════════════════════
-- admin_delete_vendor_cascade — v2
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
    -- ── 1. Messages dans les conversations liées aux produits du vendeur ──────
    --    (conversations.product_id → products.id : supprimer les messages d'abord)
    DELETE FROM public.messages
        WHERE conversation_id IN (
            SELECT id FROM public.conversations
            WHERE seller_id = p_vendor_id
               OR buyer_id  = p_vendor_id
               OR product_id IN (SELECT id FROM public.products WHERE seller_id = p_vendor_id)
        );

    -- ── 2. Conversations liées au vendeur ou à ses produits ──────────────────
    DELETE FROM public.conversations
        WHERE seller_id = p_vendor_id
           OR buyer_id  = p_vendor_id
           OR product_id IN (SELECT id FROM public.products WHERE seller_id = p_vendor_id);

    -- ── 3. Produits (plus aucune FK ne les bloque) ───────────────────────────
    DELETE FROM public.products WHERE seller_id = p_vendor_id;

    -- ── 4. Données vendeur ───────────────────────────────────────────────────
    DELETE FROM public.vendor_verifications  WHERE vendor_id  = p_vendor_id;
    DELETE FROM public.seller_follows        WHERE seller_id  = p_vendor_id;
    DELETE FROM public.vendor_ad_campaigns   WHERE user_id    = p_vendor_id;
    DELETE FROM public.hotel_review_requests WHERE hotel_id   = p_vendor_id;

    -- ── 5. Avis / notes ──────────────────────────────────────────────────────
    DELETE FROM public.reviews WHERE seller_id   = p_vendor_id;
    DELETE FROM public.reviews WHERE reviewer_id = p_vendor_id;
    DELETE FROM public.ratings WHERE seller_id   = p_vendor_id;
    DELETE FROM public.ratings WHERE reviewer_id = p_vendor_id;

    -- ── 6. Négociations ──────────────────────────────────────────────────────
    DELETE FROM public.negotiations WHERE seller_id = p_vendor_id;
    DELETE FROM public.negotiations WHERE buyer_id  = p_vendor_id;

    -- ── 7. Notifications / push ──────────────────────────────────────────────
    DELETE FROM public.notifications     WHERE user_id = p_vendor_id;
    DELETE FROM public.push_subscriptions WHERE user_id = p_vendor_id;

    -- ── 8. Fidélité ──────────────────────────────────────────────────────────
    DELETE FROM public.loyalty_transactions WHERE user_id = p_vendor_id;
    DELETE FROM public.loyalty_accounts     WHERE user_id = p_vendor_id;

    -- ── 9. Litiges / transferts ──────────────────────────────────────────────
    DELETE FROM public.disputes       WHERE user_id = p_vendor_id;
    DELETE FROM public.bank_transfers WHERE user_id = p_vendor_id;

    -- ── 10. Commandes : garder l'historique, détacher seulement les pending ──
    UPDATE public.orders SET user_id = NULL
        WHERE user_id = p_vendor_id
          AND status IN ('pending', 'rejected');

    -- ── 11. Panier ───────────────────────────────────────────────────────────
    DELETE FROM public.cart WHERE user_id = p_vendor_id;

    -- ── 12. Profil (en dernier) ──────────────────────────────────────────────
    DELETE FROM public.profiles WHERE id = p_vendor_id;

    -- La suppression auth.users est faite côté JS après cet appel.
END;
$$;

-- Permissions : service_role uniquement (jamais exposé aux utilisateurs)
REVOKE ALL ON FUNCTION public.admin_delete_vendor_cascade(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_vendor_cascade(UUID) TO service_role;
