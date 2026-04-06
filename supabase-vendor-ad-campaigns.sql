-- ============================================================
-- Campagnes publicitaires vendeur (hero + tuiles)
-- Exécuter dans Supabase → SQL Editor après relecture.
-- ============================================================

CREATE TABLE IF NOT EXISTS vendor_ad_campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    link_url text NOT NULL,
    link_type text NOT NULL CHECK (link_type IN ('product', 'store')),
    image_url text NOT NULL,
    title text,
    description text,
    placement text NOT NULL CHECK (placement IN ('hero', 'tile')),
    duration_days integer NOT NULL CHECK (duration_days IN (3, 7, 14, 30)),
    price_fcfa integer NOT NULL CHECK (price_fcfa > 0),
    status text NOT NULL DEFAULT 'pending_payment' CHECK (
        status IN (
            'pending_payment',
            'pending_review',
            'active',
            'rejected',
            'expired',
            'cancelled'
        )
    ),
    payment_note text,
    payment_method text,
    transaction_id text,
    paid_at timestamptz,
    reviewed_at timestamptz,
    reviewed_by uuid REFERENCES profiles(id),
    reject_reason text,
    start_date timestamptz,
    end_date timestamptz,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_ad_campaigns_seller ON vendor_ad_campaigns(seller_id);
CREATE INDEX IF NOT EXISTS idx_vendor_ad_campaigns_status_dates ON vendor_ad_campaigns(status, placement, start_date, end_date);

ALTER TABLE vendor_ad_campaigns ENABLE ROW LEVEL SECURITY;

-- Lecture publique : campagnes actives dans la fenêtre de diffusion
CREATE POLICY "Campagnes actives visibles publiquement"
    ON vendor_ad_campaigns FOR SELECT
    USING (
        status = 'active'
        AND start_date IS NOT NULL
        AND end_date IS NOT NULL
        AND start_date <= now()
        AND end_date >= now()
    );

-- Vendeur : voir ses campagnes
CREATE POLICY "Vendeur lit ses campagnes"
    ON vendor_ad_campaigns FOR SELECT
    TO authenticated
    USING (seller_id = auth.uid());

-- Vendeur : créer une campagne
CREATE POLICY "Vendeur crée une campagne"
    ON vendor_ad_campaigns FOR INSERT
    TO authenticated
    WITH CHECK (
        seller_id = auth.uid()
        AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'vendor')
    );

-- Vendeur : mise à jour uniquement tant que la campagne n’est pas validée / active / expirée
DROP POLICY IF EXISTS "Vendeur met à jour ses brouillons" ON vendor_ad_campaigns;
CREATE POLICY "Vendeur met à jour ses brouillons"
    ON vendor_ad_campaigns FOR UPDATE
    TO authenticated
    USING (
        seller_id = auth.uid()
        AND status IN ('pending_payment', 'pending_review')
    )
    WITH CHECK (
        seller_id = auth.uid()
        AND status IN ('pending_payment', 'pending_review', 'cancelled')
    );

-- Admin : tout
CREATE POLICY "Admin gère toutes les campagnes"
    ON vendor_ad_campaigns FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

COMMENT ON TABLE vendor_ad_campaigns IS 'Campagnes pub vendeur : hero (max 7 affichés mélangés aux ads admin) ou tuiles.';
