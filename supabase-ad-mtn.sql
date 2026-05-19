-- Migration : ajout du champ mtn_reference_id sur vendor_ad_campaigns
-- Exécuter dans le SQL Editor de Supabase

ALTER TABLE public.vendor_ad_campaigns
    ADD COLUMN IF NOT EXISTS mtn_reference_id TEXT DEFAULT NULL;
