-- =============================================================================
-- MIGRATION FINALE — LANCEMENT COMMERCIAL MAYOMBE MARKET
-- =============================================================================
-- Auteur : Claude Sonnet 4.6 — 2026-10-10
-- NE PAS APPLIQUER EN PRODUCTION SANS VALIDATION PRÉALABLE EN STAGING
--
-- Ce fichier regroupe TOUTES les migrations nécessaires pour le lancement,
-- dans l'ordre correct, en éliminant les doublons entre les fichiers individuels.
--
-- FICHIERS SOURCES CONSOLIDÉS (dans cet ordre) :
--   1. supabase-migration-vendor-suspension.sql
--   2. supabase-migration-direct-payment.sql
--   3. supabase-migration-notifications-delivery.sql
--   (supabase-fix-verification-status.sql est un correctif optionnel indépendant)
--
-- TOUTES LES OPÉRATIONS SONT IDEMPOTENTES (ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS)
-- → Sûr à ré-appliquer si une partie a déjà été exécutée.
-- =============================================================================

-- ─── 1. PROFILS : Suspension des vendeurs ────────────────────────────────────

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
    ADD COLUMN IF NOT EXISTS suspension_reason text;

CREATE INDEX IF NOT EXISTS idx_profiles_vendor_active
    ON profiles (role, is_suspended)
    WHERE role = 'vendor' AND is_suspended = false;

-- ─── 2. PROFILS : Paiement direct vendeur (numéros Mobile Money) ─────────────

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS mtn_momo_number text,
    ADD COLUMN IF NOT EXISTS airtel_money_number text,
    ADD COLUMN IF NOT EXISTS payment_holder_name text;

-- ─── 3. PROFILS : Livraison vendeur + retrait en boutique ────────────────────

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS vendor_delivery_fee integer,
    ADD COLUMN IF NOT EXISTS vendor_pickup_address text;

-- ─── 4. COMMANDES : Suivi des paiements par vendeur (JSONB) ──────────────────
-- Structure : { "<seller_uuid>": { amount, method, vendor_number, holder_name,
--              transaction_id, vendor_confirmed, vendor_confirmed_at, disputed } }

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS vendor_payments jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Index GIN optionnel (activer si les requêtes admin sur vendor_payments sont lentes)
-- CREATE INDEX IF NOT EXISTS idx_orders_vendor_payments ON orders USING gin(vendor_payments);

-- ─── 5. NOTIFICATIONS : Déduplication via reference_id ───────────────────────

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS reference_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup
    ON notifications (user_id, type, reference_id)
    WHERE reference_id IS NOT NULL;

-- =============================================================================
-- VÉRIFICATIONS POST-MIGRATION (à exécuter pour valider)
-- =============================================================================

-- Vérifier les nouvelles colonnes profiles :
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'profiles'
--   AND column_name IN ('is_suspended','suspended_at','suspension_reason',
--                       'mtn_momo_number','airtel_money_number','payment_holder_name',
--                       'vendor_delivery_fee','vendor_pickup_address');

-- Vérifier la colonne orders.vendor_payments :
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'orders' AND column_name = 'vendor_payments';

-- Vérifier l'index de déduplication notifications :
-- SELECT indexname, indexdef FROM pg_indexes
-- WHERE tablename = 'notifications' AND indexname = 'idx_notifications_dedup';

-- =============================================================================
-- CORRECTIF OPTIONNEL (indépendant — vendeurs bloqués en "Vérification en cours")
-- Décommenter et exécuter séparément si nécessaire :
-- =============================================================================
-- UPDATE profiles
-- SET verification_status = 'unverified', updated_at = NOW()
-- WHERE role = 'vendor'
--   AND verification_status = 'pending'
--   AND NOT EXISTS (
--       SELECT 1 FROM vendor_verifications
--       WHERE vendor_id = profiles.id AND status = 'pending'
--   );
