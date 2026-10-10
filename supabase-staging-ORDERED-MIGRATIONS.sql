-- =============================================================================
-- MAYOMBE MARKET — MIGRATIONS ORDONNÉES POUR BASE STAGING
-- =============================================================================
-- Ce fichier applique toutes les migrations dans le bon ordre sur une base
-- qui contient déjà le schéma de base (tables core + auth).
--
-- PRÉREQUIS OBLIGATOIRE :
-- Les tables core n'existent pas dans les fichiers SQL du repo.
-- Elles ont été créées via le dashboard Supabase.
-- Pour créer une base staging complète, deux options :
--
--   OPTION A (recommandée) — Export depuis la production :
--     1. Dans le dashboard Supabase prod → Settings → Database
--        → "Migrations" ou utiliser Supabase CLI :
--        supabase db dump --db-url <URL_PROD> --schema public > prod-schema-base.sql
--     2. Appliquer prod-schema-base.sql sur la base staging
--     3. Vider les données : TRUNCATE orders, products, profiles CASCADE; (sauf auth.users)
--     4. Appliquer ce fichier (certaines instructions sont déjà dans le dump — IF NOT EXISTS protège)
--     5. Appliquer supabase-staging-seed.sql
--
--   OPTION B — Supabase CLI avec schéma Supabase Auth :
--     supabase init && supabase db push --db-url <URL_STAGING>
--     (Nécessite que les migrations soient dans supabase/migrations/ — pas encore en place)
--
-- TOUTES LES OPÉRATIONS CI-DESSOUS SONT IDEMPOTENTES.
-- =============================================================================

-- ─── ÉTAPE 1 : RLS de base ───────────────────────────────────────────────────
-- supabase-rls-policies.sql
-- (Contient : ENABLE ROW LEVEL SECURITY + CREATE POLICY sur toutes les tables core)
-- ⚠️  À ignorer si la base vient du dump prod (policies déjà présentes).

-- ─── ÉTAPE 2 : Colonnes profiles (shop) ──────────────────────────────────────
\i supabase-profiles-shop-columns.sql

-- ─── ÉTAPE 3 : Colonnes profiles (city) ──────────────────────────────────────
\i supabase-profiles-city.sql

-- ─── ÉTAPE 4 : Colonnes profiles (city display format) ───────────────────────
\i supabase-profiles-city-display-format.sql

-- ─── ÉTAPE 5 : Colonnes profiles (return policy + shipping) ──────────────────
\i supabase-profiles-return-policy-shipping.sql

-- ─── ÉTAPE 6 : Colonnes profiles (shop description) ─────────────────────────
\i supabase-profiles-shop-description.sql

-- ─── ÉTAPE 7 : RLS shop description ─────────────────────────────────────────
\i supabase-profiles-shop-description-rls.sql

-- ─── ÉTAPE 8 : Vendor type ───────────────────────────────────────────────────
\i supabase-vendor-type.sql

-- ─── ÉTAPE 9 : Terms acceptés ────────────────────────────────────────────────
\i supabase-terms-accepted.sql

-- ─── ÉTAPE 10 : Profile terms client/vendor ──────────────────────────────────
\i supabase-profile-terms-client-vendor.sql

-- ─── ÉTAPE 11 : Vérification vendeur (table vendor_verifications) ─────────────
\i supabase-vendor-verification.sql

-- ─── ÉTAPE 12 : Storage vendeur verifications ────────────────────────────────
\i supabase-storage-vendor-verifications.sql

-- ─── ÉTAPE 13 : Vérification passeport/NIU ───────────────────────────────────
\i supabase-verification-passport-niu.sql

-- ─── ÉTAPE 14 : Vérification v2 ──────────────────────────────────────────────
\i supabase-verification-v2.sql

-- ─── ÉTAPE 15 : Colonnes produits listage extras ─────────────────────────────
\i supabase-products-listing-extras.sql

-- ─── ÉTAPE 16 : Prix de comparaison produits ─────────────────────────────────
\i supabase-products-compare-price.sql

-- ─── ÉTAPE 17 : Options produits ─────────────────────────────────────────────
\i supabase-product-options.sql

-- ─── ÉTAPE 18 : Annonces / ads colonnes ──────────────────────────────────────
\i supabase-ads-columns.sql

-- ─── ÉTAPE 19 : Storage bucket produits ──────────────────────────────────────
\i supabase-storage-products.sql

-- ─── ÉTAPE 20 : Storage bucket produits (limites) ────────────────────────────
\i supabase-storage-products-bucket-limit.sql

-- ─── ÉTAPE 21 : RLS profiles + RPC subscriptions ────────────────────────────
\i supabase-profiles-rls-and-subscription-rpc.sql

-- ─── ÉTAPE 22 : Idempotency sur commandes ────────────────────────────────────
\i supabase-idempotency.sql

-- ─── ÉTAPE 23 : Campagnes pub vendeur (table vendor_ad_campaigns) ────────────
\i supabase-vendor-ad-campaigns.sql

-- ─── ÉTAPE 24 : Colonnes paiement campagnes pub ──────────────────────────────
\i supabase-vendor-ad-campaigns-payment-columns.sql

-- ─── ÉTAPE 25 : MTN MoMo colonnes sur ads ────────────────────────────────────
\i supabase-ad-mtn.sql

-- ─── ÉTAPE 26 : MTN MoMo colonnes profils ────────────────────────────────────
\i supabase-mtn-momo-columns.sql

-- ─── ÉTAPE 27 : Admin confirm order (RPC) ────────────────────────────────────
\i supabase-admin-confirm-order.sql

-- ─── ÉTAPE 28 : Admin reject order (RPC) ─────────────────────────────────────
\i supabase-admin-reject-order.sql

-- ─── ÉTAPE 29 : Admin delete order (RPC) ─────────────────────────────────────
\i supabase-admin-delete-order.sql

-- ─── ÉTAPE 30 : Buyer payment notice ─────────────────────────────────────────
\i supabase-orders-buyer-payment-notice.sql

-- ─── ÉTAPE 31 : Vendor realtime sync ─────────────────────────────────────────
\i supabase-orders-vendor-realtime-sync.sql

-- ─── ÉTAPE 32 : Concurrency fixes ────────────────────────────────────────────
\i supabase-concurrency-fixes.sql

-- ─── ÉTAPE 33 : Disputes (table disputes) ────────────────────────────────────
\i supabase-litiges.sql

-- ─── ÉTAPE 34 : Comptable (table bank_transfers) ─────────────────────────────
\i supabase-comptable.sql

-- ─── ÉTAPE 35 : Logistician (table ratings) ──────────────────────────────────
\i supabase-migration-logistician.sql

-- ─── ÉTAPE 36 : Pâtisserie migration ─────────────────────────────────────────
\i supabase-patisserie-migration.sql

-- ─── ÉTAPE 37 : Pâtisserie GPS ───────────────────────────────────────────────
\i supabase-patisserie-gps.sql

-- ─── ÉTAPE 38 : Hôtel ────────────────────────────────────────────────────────
\i supabase-hotel.sql

-- ─── ÉTAPE 39 : Hotel reviews (table hotel_review_requests) ──────────────────
\i supabase-hotel-reviews.sql

-- ─── ÉTAPE 40 : Immobilier subcategories ─────────────────────────────────────
\i supabase-immobilier-subcategories-append.sql

-- ─── ÉTAPE 41 : Immobilier cleanup ───────────────────────────────────────────
\i supabase-immobilier-cleanup.sql

-- ─── ÉTAPE 42 : Vendeurs storage + profiles unlock ───────────────────────────
\i supabase-vendors-storage-and-profiles-unlock.sql

-- ─── ÉTAPE 43 : Delete vendor cascade ────────────────────────────────────────
\i supabase-delete-vendor-cascade.sql

-- ─── ÉTAPE 44 : Categories seed ──────────────────────────────────────────────
\i supabase-categories-seed.sql

-- ─── ÉTAPE 45 : Categories append new ────────────────────────────────────────
\i supabase-categories-append-new.sql

-- ─── ÉTAPE 46 : Subscription next plan ───────────────────────────────────────
\i supabase-subscription-next-plan.sql

-- ─── ÉTAPE 47 : Fix subscription plan check ──────────────────────────────────
\i supabase-fix-subscription-plan-check.sql

-- ─── ÉTAPE 48 : Orphan products cleanup ──────────────────────────────────────
\i supabase-orphan-products-cleanup.sql

-- ─── ÉTAPE 49 : Loyalty schema ───────────────────────────────────────────────
\i supabase-loyalty-schema.sql

-- ─── ÉTAPE 50 : Loyalty RPC ──────────────────────────────────────────────────
\i supabase-loyalty-rpc.sql

-- ─── ÉTAPE 51 : Loyalty cron ─────────────────────────────────────────────────
\i supabase-loyalty-cron.sql

-- ─── ÉTAPE 52 : Migration paiement fields ────────────────────────────────────
\i supabase-migration-payment-fields.sql

-- ─── ÉTAPE 53 : Migration notifications + delivery ───────────────────────────
\i supabase-migration-notifications-delivery.sql

-- ─── ÉTAPE 54 : Migration direct payment ─────────────────────────────────────
\i supabase-migration-direct-payment.sql

-- ─── ÉTAPE 55 : Migration vendor suspension ──────────────────────────────────
\i supabase-migration-vendor-suspension.sql

-- ─── ÉTAPE 56 : Fix verification status (optionnel) ──────────────────────────
-- \i supabase-fix-verification-status.sql  -- Décommenter si nécessaire

-- ─── ÉTAPE 57 : MIGRATION FINALE LANCEMENT (contient RPC confirm_vendor_payment) ─
\i supabase-migration-LAUNCH-FINAL.sql

-- =============================================================================
-- NOTE : \i ne fonctionne que avec psql. Dans Supabase SQL Editor, coller
-- le contenu de chaque fichier dans l'ordre. Pour psql :
--
--   psql $DATABASE_URL -f supabase-staging-ORDERED-MIGRATIONS.sql
--
-- Depuis le dashboard Supabase, utiliser "SQL Editor" et coller chaque fichier
-- un à un dans l'ordre numéroté ci-dessus.
-- =============================================================================
