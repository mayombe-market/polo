-- ═══════════════════════════════════════════════════════════════
-- MIGRATION : Logisticien + Notation Triple
-- Exécuter dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Nouvelles colonnes sur orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS logistician_id uuid REFERENCES profiles(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_up_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_confirmed boolean DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_confirmed_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee int DEFAULT 0;

-- 2. Nouvelle colonne loyalty_points sur profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS loyalty_points int DEFAULT 0;

-- 3. Table ratings (notation triple)
CREATE TABLE IF NOT EXISTS ratings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid REFERENCES orders(id) UNIQUE NOT NULL,
    user_id uuid REFERENCES profiles(id) NOT NULL,
    vendor_rating int CHECK (vendor_rating BETWEEN 1 AND 5),
    vendor_tags text[] DEFAULT '{}',
    delivery_rating int CHECK (delivery_rating BETWEEN 1 AND 5),
    delivery_tags text[] DEFAULT '{}',
    platform_rating int CHECK (platform_rating BETWEEN 1 AND 5),
    platform_tags text[] DEFAULT '{}',
    comment text DEFAULT '',
    created_at timestamptz DEFAULT now()
);

-- 4. RLS sur ratings
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- L'utilisateur peut voir ses propres notations
CREATE POLICY "Users can view own ratings" ON ratings
    FOR SELECT USING (auth.uid() = user_id);

-- L'utilisateur peut insérer ses propres notations
CREATE POLICY "Users can insert own ratings" ON ratings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin peut tout voir
CREATE POLICY "Admin can view all ratings" ON ratings
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 5. RLS orders — le logisticien peut lire ses commandes assignées
CREATE POLICY "Logistician can view assigned orders" ON orders
    FOR SELECT USING (auth.uid() = logistician_id);

-- Le logisticien peut mettre à jour ses commandes assignées
CREATE POLICY "Logistician can update assigned orders" ON orders
    FOR UPDATE USING (auth.uid() = logistician_id);

-- 6. Index pour performances
CREATE INDEX IF NOT EXISTS idx_orders_logistician_id ON orders(logistician_id);
CREATE INDEX IF NOT EXISTS idx_ratings_order_id ON ratings(order_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);

-- 7. Activer le realtime sur ratings
ALTER PUBLICATION supabase_realtime ADD TABLE ratings;
