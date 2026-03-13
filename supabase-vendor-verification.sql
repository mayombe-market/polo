-- ================================================
-- SYSTEME DE VERIFICATION VENDEUR
-- A exécuter dans Supabase SQL Editor
-- ================================================

-- 1. Ajouter le statut de vérification sur profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';

-- 2. Créer la table vendor_verifications
CREATE TABLE IF NOT EXISTS vendor_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Documents
    shop_photo_url TEXT NOT NULL,
    cni_photo_url TEXT NOT NULL,

    -- Identité
    cni_name TEXT NOT NULL,
    momo_name TEXT NOT NULL,
    momo_number TEXT NOT NULL,
    momo_operator TEXT NOT NULL CHECK (momo_operator IN ('MTN', 'Airtel')),

    -- Revue admin
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_vendor_verifications_status ON vendor_verifications(status);
CREATE INDEX IF NOT EXISTS idx_vendor_verifications_vendor ON vendor_verifications(vendor_id);

-- 3. RLS (Row Level Security)
ALTER TABLE vendor_verifications ENABLE ROW LEVEL SECURITY;

-- Les vendeurs peuvent voir leurs propres vérifications
CREATE POLICY "Vendors can view own verifications"
ON vendor_verifications FOR SELECT
USING (auth.uid() = vendor_id);

-- Les vendeurs peuvent soumettre une vérification (pas si une est déjà en pending)
CREATE POLICY "Vendors can submit verification"
ON vendor_verifications FOR INSERT
WITH CHECK (
    auth.uid() = vendor_id
    AND NOT EXISTS (
        SELECT 1 FROM vendor_verifications v
        WHERE v.vendor_id = auth.uid() AND v.status = 'pending'
    )
);

-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all verifications"
ON vendor_verifications FOR SELECT
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Les admins peuvent mettre à jour
CREATE POLICY "Admins can update verifications"
ON vendor_verifications FOR UPDATE
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Fonctions RPC pour approuver/refuser (SECURITY DEFINER = update les 2 tables atomiquement)
CREATE OR REPLACE FUNCTION approve_vendor_verification(
    p_verification_id UUID,
    p_admin_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE vendor_verifications
    SET status = 'approved', reviewed_by = p_admin_id, reviewed_at = NOW(), updated_at = NOW()
    WHERE id = p_verification_id AND status = 'pending';

    UPDATE profiles
    SET verification_status = 'verified', updated_at = NOW()
    WHERE id = (SELECT vendor_id FROM vendor_verifications WHERE id = p_verification_id);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_vendor_verification(
    p_verification_id UUID,
    p_admin_id UUID,
    p_reason TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE vendor_verifications
    SET status = 'rejected', reviewed_by = p_admin_id, reviewed_at = NOW(),
        rejection_reason = p_reason, updated_at = NOW()
    WHERE id = p_verification_id AND status = 'pending';

    UPDATE profiles
    SET verification_status = 'rejected', updated_at = NOW()
    WHERE id = (SELECT vendor_id FROM vendor_verifications WHERE id = p_verification_id);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Realtime pour les notifications admin
ALTER PUBLICATION supabase_realtime ADD TABLE vendor_verifications;
