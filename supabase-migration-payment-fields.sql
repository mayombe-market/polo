-- Migration : champs de paiement sur les profils vendeur
-- Mission 2 — Pour le paiement direct vendeur (futur)
-- À appliquer manuellement dans Supabase Dashboard > SQL Editor
-- NE PAS APPLIQUER EN PRODUCTION SANS VALIDATION

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mtn_momo_number text,
  ADD COLUMN IF NOT EXISTS airtel_money_number text,
  ADD COLUMN IF NOT EXISTS payment_holder_name text;

-- Commentaire : ces champs permettront à terme de router le paiement
-- directement vers le vendeur (Mission 3 — sous-commandes).
-- Ne pas activer tant que l'architecture de sous-commandes n'est pas déployée.
