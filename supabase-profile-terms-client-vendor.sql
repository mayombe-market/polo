-- Horodatage des acceptations distinctes (inscription complete-profile)
-- À exécuter dans le SQL Editor Supabase.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS client_terms_accepted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vendor_terms_accepted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN profiles.client_terms_accepted_at IS 'Acceptation conditions acheteur (/legal/conditions-acheteur) à l''inscription.';
COMMENT ON COLUMN profiles.vendor_terms_accepted_at IS 'Acceptation conditions vendeur (/legal/conditions-vendeur) à l''inscription.';
