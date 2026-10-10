-- =============================================================================
-- MAYOMBE MARKET — DONNÉES DE TEST (STAGING SEED)
-- =============================================================================
-- Crée : 1 admin, 2 vendeurs (MTN + Airtel), 1 acheteur, produits + catégories
--
-- PRÉREQUIS :
--   1. Créer les 4 comptes auth dans Supabase Dashboard → Authentication → Users :
--      - admin@staging.test        UUID → mettre dans STAGING_ADMIN_ID ci-dessous
--      - vendeur-mtn@staging.test  UUID → mettre dans STAGING_VENDOR_MTN_ID
--      - vendeur-airtel@staging.test UUID → mettre dans STAGING_VENDOR_AIRTEL_ID
--      - acheteur@staging.test     UUID → mettre dans STAGING_BUYER_ID
--
--   2. Adapter les 4 UUIDs dans la section "CONFIGURATION" ci-dessous
--   3. Exécuter ce fichier dans Supabase SQL Editor (ou psql)
--
-- ⚠️  NE PAS EXÉCUTER EN PRODUCTION.
-- =============================================================================

-- ─── CONFIGURATION : remplacer ces UUIDs par ceux créés dans Auth ────────────

DO $$
DECLARE
    v_admin_id   UUID := '00000000-0000-0000-0000-000000000001'; -- ← remplacer
    v_vendor_mtn UUID := '00000000-0000-0000-0000-000000000002'; -- ← remplacer
    v_vendor_air UUID := '00000000-0000-0000-0000-000000000003'; -- ← remplacer
    v_buyer_id   UUID := '00000000-0000-0000-0000-000000000004'; -- ← remplacer
    v_cat_id     UUID;
    v_subcat_id  UUID;
BEGIN

-- ─── PROFILS ──────────────────────────────────────────────────────────────────

INSERT INTO profiles (id, email, role, full_name, phone, city,
    shop_name, shop_description, is_suspended, verification_status,
    mtn_momo_number, airtel_money_number, payment_holder_name,
    vendor_delivery_fee, vendor_pickup_address)
VALUES
    -- Admin
    (v_admin_id, 'admin@staging.test', 'admin', 'Admin Staging', '060000001', 'Brazzaville',
     NULL, NULL, false, 'approved', NULL, NULL, NULL, NULL, NULL),

    -- Vendeur 1 — MTN MoMo
    (v_vendor_mtn, 'vendeur-mtn@staging.test', 'vendor', 'Boutique Alpha', '064000001', 'Brazzaville',
     'Alpha Tech', 'Électronique et accessoires de qualité', false, 'approved',
     '064000001', NULL, 'MABIKA Jean-Paul',
     1500, '12 Rue du Commerce, Bacongo, Brazzaville'),

    -- Vendeur 2 — Airtel Money
    (v_vendor_air, 'vendeur-airtel@staging.test', 'vendor', 'Boutique Beta', '055000001', 'Pointe-Noire',
     'Beta Mode', 'Vêtements et accessoires tendance', false, 'approved',
     NULL, '055000001', 'NZILA Marie-Claire',
     2000, '5 Avenue Loufoulakari, Pointe-Noire'),

    -- Acheteur
    (v_buyer_id, 'acheteur@staging.test', 'client', 'Client Test', '060000099', 'Brazzaville',
     NULL, NULL, false, 'unverified', NULL, NULL, NULL, NULL, NULL)

ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    shop_name = EXCLUDED.shop_name,
    mtn_momo_number = EXCLUDED.mtn_momo_number,
    airtel_money_number = EXCLUDED.airtel_money_number,
    payment_holder_name = EXCLUDED.payment_holder_name,
    vendor_delivery_fee = EXCLUDED.vendor_delivery_fee,
    vendor_pickup_address = EXCLUDED.vendor_pickup_address;

-- ─── CATÉGORIE DE TEST ────────────────────────────────────────────────────────

-- Utiliser une catégorie existante ou en créer une
SELECT id INTO v_cat_id FROM category WHERE name ILIKE '%électronique%' LIMIT 1;

IF v_cat_id IS NULL THEN
    INSERT INTO category (name, description, image_url)
    VALUES ('Test Catégorie', 'Catégorie de test staging', NULL)
    RETURNING id INTO v_cat_id;
END IF;

SELECT id INTO v_subcat_id FROM sub_category WHERE category_id = v_cat_id LIMIT 1;

IF v_subcat_id IS NULL THEN
    INSERT INTO sub_category (name, category_id)
    VALUES ('Test Sous-catégorie', v_cat_id)
    RETURNING id INTO v_subcat_id;
END IF;

-- ─── PRODUITS VENDEUR 1 (MTN) ────────────────────────────────────────────────

INSERT INTO products (seller_id, name, description, price, category_id, sub_category_id,
    status, stock, images, city)
VALUES
    (v_vendor_mtn, 'Écouteurs Bluetooth TEST', 'Écouteurs sans fil — produit de test staging',
     8500, v_cat_id, v_subcat_id, 'active', 10,
     ARRAY['https://via.placeholder.com/400x400?text=Ecouteurs'], 'Brazzaville'),

    (v_vendor_mtn, 'Chargeur Rapide TEST', 'Chargeur USB-C 65W — produit de test staging',
     6000, v_cat_id, v_subcat_id, 'active', 5,
     ARRAY['https://via.placeholder.com/400x400?text=Chargeur'], 'Brazzaville')

ON CONFLICT DO NOTHING;

-- ─── PRODUITS VENDEUR 2 (Airtel) ─────────────────────────────────────────────

INSERT INTO products (seller_id, name, description, price, category_id, sub_category_id,
    status, stock, images, city)
VALUES
    (v_vendor_air, 'T-Shirt Coton TEST', 'T-shirt coton bio — produit de test staging',
     4500, v_cat_id, v_subcat_id, 'active', 20,
     ARRAY['https://via.placeholder.com/400x400?text=TShirt'], 'Pointe-Noire'),

    (v_vendor_air, 'Sac à dos TEST', 'Sac à dos 20L imperméable — produit de test staging',
     12000, v_cat_id, v_subcat_id, 'active', 8,
     ARRAY['https://via.placeholder.com/400x400?text=Sac'], 'Pointe-Noire')

ON CONFLICT DO NOTHING;

RAISE NOTICE 'Seed staging terminé.';
RAISE NOTICE 'Admin:          %', v_admin_id;
RAISE NOTICE 'Vendeur MTN:    %', v_vendor_mtn;
RAISE NOTICE 'Vendeur Airtel: %', v_vendor_air;
RAISE NOTICE 'Acheteur:       %', v_buyer_id;

END $$;
