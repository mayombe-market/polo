-- ============================================================
-- SEED : Catégories & Sous-catégories — Mayombe Market
-- À exécuter dans Supabase → SQL Editor
-- ⚠️  ATTENTION : Supprime les anciennes catégories/sous-catégories
-- ============================================================

-- 1. Migrer les produits avec les anciens noms de catégorie
UPDATE products SET category = 'Mode & Beauté' WHERE category IN ('Perruques', 'Beauté', 'Accessoires');
UPDATE products SET category = 'Pâtisserie & Traiteur' WHERE category = 'Pâtisserie';
UPDATE products SET category = 'High-Tech' WHERE category = 'Téléphones';
UPDATE products SET category = 'Pharmacie & Santé' WHERE category = 'Pharmacie';

-- 2. Nettoyer les anciennes données
DELETE FROM sub_category;
DELETE FROM category;

-- 3. Insérer les catégories avec images Unsplash
INSERT INTO category (name, img) VALUES
('Mode & Beauté', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80'),
('High-Tech', 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&q=80'),
('Pharmacie & Santé', 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800&q=80'),
('Électroménager', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80'),
('Maison & Déco', 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80'),
('Pâtisserie & Traiteur', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80'),
('Immobilier', 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80'),
('Alimentation & Boissons', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80'),
('Auto & Moto', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80'),
('Bébé & Enfants', 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&q=80'),
('Sport & Loisirs', 'https://images.unsplash.com/photo-1461896836934-bd45ba28a6e4?w=800&q=80'),
('Services', 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80'),
('Fournitures & Bureau', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80'),
('Agriculture & Élevage', 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&q=80'),
('Matériaux & BTP', 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80');

-- 4. Insérer les sous-catégories
-- Mode & Beauté
INSERT INTO sub_category (name, category_id) SELECT 'Perruques & Mèches', id FROM category WHERE name = 'Mode & Beauté';
INSERT INTO sub_category (name, category_id) SELECT 'Vêtements Femme', id FROM category WHERE name = 'Mode & Beauté';
INSERT INTO sub_category (name, category_id) SELECT 'Vêtements Homme', id FROM category WHERE name = 'Mode & Beauté';
INSERT INTO sub_category (name, category_id) SELECT 'Chaussures', id FROM category WHERE name = 'Mode & Beauté';
INSERT INTO sub_category (name, category_id) SELECT 'Sacs & Pochettes', id FROM category WHERE name = 'Mode & Beauté';
INSERT INTO sub_category (name, category_id) SELECT 'Bijoux & Montres', id FROM category WHERE name = 'Mode & Beauté';
INSERT INTO sub_category (name, category_id) SELECT 'Cosmétiques & Maquillage', id FROM category WHERE name = 'Mode & Beauté';
INSERT INTO sub_category (name, category_id) SELECT 'Parfums', id FROM category WHERE name = 'Mode & Beauté';

-- High-Tech
INSERT INTO sub_category (name, category_id) SELECT 'Smartphones & Tablettes', id FROM category WHERE name = 'High-Tech';
INSERT INTO sub_category (name, category_id) SELECT 'Ordinateurs & Laptops', id FROM category WHERE name = 'High-Tech';
INSERT INTO sub_category (name, category_id) SELECT 'Accessoires Tech', id FROM category WHERE name = 'High-Tech';
INSERT INTO sub_category (name, category_id) SELECT 'Audio & Casques', id FROM category WHERE name = 'High-Tech';
INSERT INTO sub_category (name, category_id) SELECT 'TV & Écrans', id FROM category WHERE name = 'High-Tech';
INSERT INTO sub_category (name, category_id) SELECT 'Consoles & Jeux vidéo', id FROM category WHERE name = 'High-Tech';

-- Pharmacie & Santé
INSERT INTO sub_category (name, category_id) SELECT 'Matériel Médical', id FROM category WHERE name = 'Pharmacie & Santé';
INSERT INTO sub_category (name, category_id) SELECT 'Médicaments & Soins', id FROM category WHERE name = 'Pharmacie & Santé';
INSERT INTO sub_category (name, category_id) SELECT 'Compléments alimentaires', id FROM category WHERE name = 'Pharmacie & Santé';
INSERT INTO sub_category (name, category_id) SELECT 'Hygiène & Bien-être', id FROM category WHERE name = 'Pharmacie & Santé';

-- Électroménager
INSERT INTO sub_category (name, category_id) SELECT 'Cuisinières & Fours', id FROM category WHERE name = 'Électroménager';
INSERT INTO sub_category (name, category_id) SELECT 'Réfrigérateurs & Congélateurs', id FROM category WHERE name = 'Électroménager';
INSERT INTO sub_category (name, category_id) SELECT 'Micro-ondes', id FROM category WHERE name = 'Électroménager';
INSERT INTO sub_category (name, category_id) SELECT 'Lave-linge', id FROM category WHERE name = 'Électroménager';
INSERT INTO sub_category (name, category_id) SELECT 'Climatiseurs & Ventilateurs', id FROM category WHERE name = 'Électroménager';
INSERT INTO sub_category (name, category_id) SELECT 'Petit électroménager', id FROM category WHERE name = 'Électroménager';

-- Maison & Déco
INSERT INTO sub_category (name, category_id) SELECT 'Salons & Canapés', id FROM category WHERE name = 'Maison & Déco';
INSERT INTO sub_category (name, category_id) SELECT 'Lits & Matelas', id FROM category WHERE name = 'Maison & Déco';
INSERT INTO sub_category (name, category_id) SELECT 'Meubles', id FROM category WHERE name = 'Maison & Déco';
INSERT INTO sub_category (name, category_id) SELECT 'Décoration', id FROM category WHERE name = 'Maison & Déco';
INSERT INTO sub_category (name, category_id) SELECT 'Salle de bain', id FROM category WHERE name = 'Maison & Déco';
INSERT INTO sub_category (name, category_id) SELECT 'Cuisine & Arts de la table', id FROM category WHERE name = 'Maison & Déco';

-- Pâtisserie & Traiteur
INSERT INTO sub_category (name, category_id) SELECT 'Gâteaux', id FROM category WHERE name = 'Pâtisserie & Traiteur';
INSERT INTO sub_category (name, category_id) SELECT 'Viennoiseries', id FROM category WHERE name = 'Pâtisserie & Traiteur';
INSERT INTO sub_category (name, category_id) SELECT 'Pâtisseries traditionnelles', id FROM category WHERE name = 'Pâtisserie & Traiteur';
INSERT INTO sub_category (name, category_id) SELECT 'Sur commande', id FROM category WHERE name = 'Pâtisserie & Traiteur';
INSERT INTO sub_category (name, category_id) SELECT 'Plats traiteur', id FROM category WHERE name = 'Pâtisserie & Traiteur';

-- Immobilier
INSERT INTO sub_category (name, category_id) SELECT 'Appartements', id FROM category WHERE name = 'Immobilier';
INSERT INTO sub_category (name, category_id) SELECT 'Maisons', id FROM category WHERE name = 'Immobilier';
INSERT INTO sub_category (name, category_id) SELECT 'Terrains', id FROM category WHERE name = 'Immobilier';
INSERT INTO sub_category (name, category_id) SELECT 'Locaux commerciaux', id FROM category WHERE name = 'Immobilier';
INSERT INTO sub_category (name, category_id) SELECT 'Chambres meublées', id FROM category WHERE name = 'Immobilier';

-- Alimentation & Boissons
INSERT INTO sub_category (name, category_id) SELECT 'Vivres frais', id FROM category WHERE name = 'Alimentation & Boissons';
INSERT INTO sub_category (name, category_id) SELECT 'Vivres secs', id FROM category WHERE name = 'Alimentation & Boissons';
INSERT INTO sub_category (name, category_id) SELECT 'Boissons', id FROM category WHERE name = 'Alimentation & Boissons';
INSERT INTO sub_category (name, category_id) SELECT 'Épicerie fine', id FROM category WHERE name = 'Alimentation & Boissons';
INSERT INTO sub_category (name, category_id) SELECT 'Produits locaux', id FROM category WHERE name = 'Alimentation & Boissons';

-- Auto & Moto
INSERT INTO sub_category (name, category_id) SELECT 'Voitures', id FROM category WHERE name = 'Auto & Moto';
INSERT INTO sub_category (name, category_id) SELECT 'Motos & Scooters', id FROM category WHERE name = 'Auto & Moto';
INSERT INTO sub_category (name, category_id) SELECT 'Pièces détachées', id FROM category WHERE name = 'Auto & Moto';
INSERT INTO sub_category (name, category_id) SELECT 'Accessoires auto', id FROM category WHERE name = 'Auto & Moto';

-- Bébé & Enfants
INSERT INTO sub_category (name, category_id) SELECT 'Vêtements enfants', id FROM category WHERE name = 'Bébé & Enfants';
INSERT INTO sub_category (name, category_id) SELECT 'Jouets', id FROM category WHERE name = 'Bébé & Enfants';
INSERT INTO sub_category (name, category_id) SELECT 'Poussettes & Accessoires', id FROM category WHERE name = 'Bébé & Enfants';
INSERT INTO sub_category (name, category_id) SELECT 'Alimentation bébé', id FROM category WHERE name = 'Bébé & Enfants';

-- Sport & Loisirs
INSERT INTO sub_category (name, category_id) SELECT 'Équipements sportifs', id FROM category WHERE name = 'Sport & Loisirs';
INSERT INTO sub_category (name, category_id) SELECT 'Vêtements de sport', id FROM category WHERE name = 'Sport & Loisirs';
INSERT INTO sub_category (name, category_id) SELECT 'Fitness & Musculation', id FROM category WHERE name = 'Sport & Loisirs';
INSERT INTO sub_category (name, category_id) SELECT 'Camping & Plein air', id FROM category WHERE name = 'Sport & Loisirs';

-- Services
INSERT INTO sub_category (name, category_id) SELECT 'Coiffure & Esthétique', id FROM category WHERE name = 'Services';
INSERT INTO sub_category (name, category_id) SELECT 'Réparation & Dépannage', id FROM category WHERE name = 'Services';
INSERT INTO sub_category (name, category_id) SELECT 'Cours & Formation', id FROM category WHERE name = 'Services';
INSERT INTO sub_category (name, category_id) SELECT 'Événementiel', id FROM category WHERE name = 'Services';

-- Fournitures & Bureau
INSERT INTO sub_category (name, category_id) SELECT 'Papeterie', id FROM category WHERE name = 'Fournitures & Bureau';
INSERT INTO sub_category (name, category_id) SELECT 'Imprimantes & Encre', id FROM category WHERE name = 'Fournitures & Bureau';
INSERT INTO sub_category (name, category_id) SELECT 'Mobilier de bureau', id FROM category WHERE name = 'Fournitures & Bureau';
INSERT INTO sub_category (name, category_id) SELECT 'Fournitures scolaires', id FROM category WHERE name = 'Fournitures & Bureau';

-- Agriculture & Élevage
INSERT INTO sub_category (name, category_id) SELECT 'Semences & Plants', id FROM category WHERE name = 'Agriculture & Élevage';
INSERT INTO sub_category (name, category_id) SELECT 'Engrais & Produits phyto', id FROM category WHERE name = 'Agriculture & Élevage';
INSERT INTO sub_category (name, category_id) SELECT 'Outils agricoles', id FROM category WHERE name = 'Agriculture & Élevage';
INSERT INTO sub_category (name, category_id) SELECT 'Animaux & Bétail', id FROM category WHERE name = 'Agriculture & Élevage';

-- Matériaux & BTP
INSERT INTO sub_category (name, category_id) SELECT 'Ciment & Fer', id FROM category WHERE name = 'Matériaux & BTP';
INSERT INTO sub_category (name, category_id) SELECT 'Plomberie', id FROM category WHERE name = 'Matériaux & BTP';
INSERT INTO sub_category (name, category_id) SELECT 'Électricité', id FROM category WHERE name = 'Matériaux & BTP';
INSERT INTO sub_category (name, category_id) SELECT 'Peinture & Finition', id FROM category WHERE name = 'Matériaux & BTP';
INSERT INTO sub_category (name, category_id) SELECT 'Outillage', id FROM category WHERE name = 'Matériaux & BTP';
