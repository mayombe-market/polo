-- Colonnes paiement structuré (Mobile Money / Airtel) pour les campagnes vendeur.
-- Exécuter dans Supabase → SQL Editor si la table existe déjà sans ces colonnes.

ALTER TABLE vendor_ad_campaigns ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE vendor_ad_campaigns ADD COLUMN IF NOT EXISTS transaction_id text;

COMMENT ON COLUMN vendor_ad_campaigns.payment_method IS 'mobile_money | airtel_money';
COMMENT ON COLUMN vendor_ad_campaigns.transaction_id IS 'ID transaction opérateur (10 chiffres)';
