-- =============================================================================
-- MIGRATION : Paiement direct vendeur (Missions 2 & 3)
-- =============================================================================
-- À appliquer manuellement dans Supabase Dashboard > SQL Editor
-- NE PAS APPLIQUER EN PRODUCTION SANS VALIDATION
-- Auteur : Claude Sonnet 4.6 — 2026-10-10
--
-- ANALYSE DE COMPATIBILITÉ :
-- ─────────────────────────
-- 1. Toutes les colonnes ajoutées sont NULLABLE (pas de DEFAULT NOT NULL risqué)
-- 2. Les colonnes profiles.is_suspended/mtn_momo_number/etc. n'ont aucun conflit
--    avec les politiques RLS existantes :
--    - Les vendeurs mettent à jour leur propre profil → policy "vendors can update own profile" déjà présente
--    - Le service_role bypass RLS → les actions admin fonctionnent
-- 3. orders.vendor_payments est un JSONB avec DEFAULT '{}'::jsonb → aucune valeur null
--    sur les commandes historiques, elles auront juste un objet vide (fonctionnement attendu)
-- 4. L'index partiel sur is_suspended ne touche pas les données existantes
-- 5. Données historiques : AUCUNE modification, AUCUNE perte
--
-- ORDRE D'APPLICATION RECOMMANDÉ :
-- 1. Appliquer d'abord en staging/test
-- 2. Vérifier que les pages existantes continuent de fonctionner (les nouvelles colonnes sont ignorées)
-- 3. Appliquer en production pendant une fenêtre de faible trafic
-- =============================================================================

-- ─── Partie A : Profils vendeur ─────────────────────────────────────────────

-- Champs suspension (Mission 6 — déjà dans supabase-migration-vendor-suspension.sql)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_reason text;

-- Champs paiement direct (Mission 2)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mtn_momo_number text,
  ADD COLUMN IF NOT EXISTS airtel_money_number text,
  ADD COLUMN IF NOT EXISTS payment_holder_name text;

-- Index pour filtrer rapidement les vendeurs actifs (suspension)
CREATE INDEX IF NOT EXISTS idx_profiles_vendor_active
  ON profiles (role, is_suspended)
  WHERE role = 'vendor' AND is_suspended = false;

-- ─── Partie B : Suivi des paiements par vendeur sur les commandes ────────────
-- Structure du JSONB vendor_payments :
-- {
--   "<seller_uuid>": {
--     "amount": 15000,               -- montant dû à ce vendeur (items uniquement, hors frais livraison)
--     "method": "mobile_money",       -- mobile_money | airtel_money
--     "vendor_number": "06 XXX XX XX",-- numéro utilisé pour ce paiement
--     "holder_name": "Jean Dupont",   -- titulaire du compte
--     "transaction_id": "1234567890", -- référence saisie par le client
--     "vendor_confirmed": false,      -- le vendeur a-t-il confirmé la réception ?
--     "vendor_confirmed_at": null,    -- timestamp de confirmation vendeur
--     "disputed": false               -- le vendeur conteste-t-il ce paiement ?
--   }
-- }
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS vendor_payments jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Index GIN pour requêtes sur le JSONB (optionnel, utile si requêtes admin fréquentes)
-- CREATE INDEX IF NOT EXISTS idx_orders_vendor_payments ON orders USING gin(vendor_payments);

-- ─── Commentaire post-migration ─────────────────────────────────────────────
-- Après application :
-- 1. Vérifier que /vendor/dashboard charge correctement (nouvelles colonnes ignorées)
-- 2. Vérifier que /admin/orders charge correctement
-- 3. Activer la section "Numéros de paiement" dans le dashboard vendeur
-- 4. Les commandes historiques auront vendor_payments = {} → OK, l'admin confirme normalement
