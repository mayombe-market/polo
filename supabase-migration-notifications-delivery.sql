-- =============================================================================
-- MIGRATION : Déduplication notifications + modes livraison vendeur
-- =============================================================================
-- NE PAS APPLIQUER EN PRODUCTION SANS VALIDATION
-- Auteur : Claude Sonnet 4.6 — 2026-10-10
--
-- CONTENU :
-- A. notifications — colonne reference_id + index unique pour déduplication
-- B. profiles — vendor_delivery_fee + vendor_pickup_address
--
-- COMPATIBILITÉ :
-- • Toutes les colonnes ajoutées sont NULLABLE → aucune rupture pour les lignes existantes
-- • L'index unique est partiel (WHERE reference_id IS NOT NULL) →
--   les notifications sans reference_id (historiques) ne sont pas affectées
-- • Les profils existants gardent ces colonnes à NULL → comportement inchangé
-- =============================================================================

-- ─── Partie A : Déduplication des notifications ──────────────────────────────

-- Colonne de référence (ex: order.id) — permet le upsert idempotent
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS reference_id text;

-- Index unique partiel : un seul enregistrement (user, type, reference)
-- Utilisation dans createNotification via upsert onConflict
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup
    ON notifications (user_id, type, reference_id)
    WHERE reference_id IS NOT NULL;

-- ─── Partie B : Livraison organisée par le vendeur + retrait en boutique ──────

-- Frais de livraison fixés par le vendeur (en FCFA, nullable = non proposé)
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS vendor_delivery_fee integer;

-- Adresse de retrait (ex: "Boutique Chez Justice, Rue de la Paix, Moukondo")
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS vendor_pickup_address text;

-- ─── Notes post-migration ────────────────────────────────────────────────────
-- 1. Vérifier que /vendor/dashboard charge correctement
-- 2. Tester la déduplication : créer deux notifications identiques → une seule en BDD
-- 3. Tester retrait en boutique : delivery_fee = 0, delivery_mode = 'pickup'
-- 4. Tester livraison vendeur : delivery_fee = vendor_delivery_fee du profil
