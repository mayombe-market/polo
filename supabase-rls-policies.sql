-- ============================================================
-- POLITIQUES RLS (Row Level Security) — Mayombe Market
-- À exécuter dans Supabase → SQL Editor
-- ============================================================

-- ========================
-- TABLE : profiles
-- ========================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les profils publics (vendeurs affichés sur le site)
CREATE POLICY "Profils publics en lecture" ON profiles
    FOR SELECT USING (true);

-- Un utilisateur ne peut modifier QUE son propre profil (WITH CHECK explicite)
-- Note : activation abonnement par admin côté app → RPC admin_update_vendor_subscription
--         (voir supabase-profiles-rls-and-subscription-rpc.sql) pour contourner tout conflit RLS.
CREATE POLICY "Modifier son propre profil" ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Un admin peut modifier tous les profils (abonnements, rôles, etc.)
CREATE POLICY "Admin modifie tous les profils" ON profiles
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Un utilisateur ne peut insérer que son propre profil
CREATE POLICY "Créer son propre profil" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ========================
-- TABLE : products
-- ========================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les produits (site public)
CREATE POLICY "Produits visibles par tous" ON products
    FOR SELECT USING (true);

-- Vendeur (rôle vendor) insère ses produits — aligné sur supabase-storage-products.sql
CREATE POLICY "Vendeur insère ses produits" ON products
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = seller_id
        AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'vendor')
    );

CREATE POLICY "Vendeur modifie ses produits" ON products
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = seller_id)
    WITH CHECK (auth.uid() = seller_id);

-- Admin : back-office (voir supabase-storage-products.sql pour script complet)
CREATE POLICY "Admin insère produits" ON products
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

CREATE POLICY "Admin modifie tous les produits" ON products
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
    WITH CHECK (true);

-- Seul le vendeur propriétaire ou un admin peut supprimer un produit
CREATE POLICY "Vendeur ou admin supprime produit" ON products
    FOR DELETE USING (
        auth.uid() = seller_id
        OR EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ========================
-- TABLE : orders
-- ========================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- L'acheteur peut voir SES commandes (par user_id)
CREATE POLICY "Acheteur voit ses commandes" ON orders
    FOR SELECT USING (auth.uid() = user_id);

-- Un admin peut voir TOUTES les commandes
CREATE POLICY "Admin voit toutes les commandes" ON orders
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Un utilisateur connecté peut créer une commande (pour lui-même)
CREATE POLICY "Créer sa commande" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Seul un admin peut modifier une commande (confirmer paiement, libérer fonds)
CREATE POLICY "Admin modifie commandes" ON orders
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ========================
-- TABLE : negotiations
-- ========================
ALTER TABLE negotiations ENABLE ROW LEVEL SECURITY;

-- L'acheteur et le vendeur concernés peuvent voir la négociation
CREATE POLICY "Voir ses négociations" ON negotiations
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Un acheteur connecté peut créer une négociation
CREATE POLICY "Créer une négociation" ON negotiations
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Le vendeur peut modifier (accepter/refuser) ses négociations
CREATE POLICY "Vendeur répond à la négociation" ON negotiations
    FOR UPDATE USING (auth.uid() = seller_id);

-- ========================
-- TABLE : reviews (si elle existe)
-- ========================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les avis
CREATE POLICY "Avis visibles par tous" ON reviews
    FOR SELECT USING (true);

-- Un utilisateur connecté peut écrire un avis (pour lui-même)
CREATE POLICY "Écrire son avis" ON reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ========================
-- TABLE : seller_follows (si elle existe)
-- ========================
ALTER TABLE seller_follows ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les follows (compteur public)
CREATE POLICY "Follows visibles" ON seller_follows
    FOR SELECT USING (true);

-- Un utilisateur peut s'abonner
CREATE POLICY "S'abonner" ON seller_follows
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- Un utilisateur peut se désabonner
CREATE POLICY "Se désabonner" ON seller_follows
    FOR DELETE USING (auth.uid() = follower_id);

-- ========================
-- TABLE : category
-- ========================
ALTER TABLE category ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les catégories
CREATE POLICY "Catégories publiques" ON category
    FOR SELECT USING (true);

-- ========================
-- TABLE : sub_category (si elle existe)
-- ========================
ALTER TABLE sub_category ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sous-catégories publiques" ON sub_category
    FOR SELECT USING (true);

-- ========================
-- TABLE : ads
-- ========================
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Publicités publiques" ON ads
    FOR SELECT USING (true);

-- ========================
-- TABLE : likes (si elle existe)
-- ========================
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes visibles" ON likes
    FOR SELECT USING (true);

CREATE POLICY "Liker" ON likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Retirer son like" ON likes
    FOR DELETE USING (auth.uid() = user_id);

-- ========================
-- TABLE : conversations
-- ========================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their conversations" ON conversations
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Buyers create conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- ========================
-- TABLE : messages
-- ========================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see conversation messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = conversation_id
            AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
        )
    );

CREATE POLICY "Users send messages" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = conversation_id
            AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
        )
    );

CREATE POLICY "Users mark messages read" ON messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = conversation_id
            AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
        )
    );

-- Activer le realtime pour les messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ========================
-- TABLE : notifications
-- ========================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System creates notifications" ON notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users mark notifications read" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Activer le realtime pour les notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ========================
-- STORAGE : bucket products
-- ========================
-- Dans Supabase → Storage → products → Policies, ajouter :
-- INSERT : Authentifié uniquement, taille max 5MB, types image/*
-- SELECT : Public (pour afficher les images)
-- DELETE : Propriétaire uniquement (auth.uid()::text = (storage.foldername(name))[1])
