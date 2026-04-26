-- ============================================================
-- APPEND : Nouvelles catégories & sous-catégories — Mayombe Market
-- Ajout sans suppression des données existantes (idempotent).
-- À exécuter dans Supabase → SQL Editor
-- ============================================================

-- Bricolage & Outillage
INSERT INTO category (name, img)
SELECT 'Bricolage & Outillage', 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&q=80'
WHERE NOT EXISTS (SELECT 1 FROM category WHERE name = 'Bricolage & Outillage');

INSERT INTO sub_category (name, category_uuid)
SELECT 'Outillage électrique', id FROM category WHERE name = 'Bricolage & Outillage'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Outillage électrique' AND category_uuid = (SELECT id FROM category WHERE name = 'Bricolage & Outillage'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Outillage à main', id FROM category WHERE name = 'Bricolage & Outillage'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Outillage à main' AND category_uuid = (SELECT id FROM category WHERE name = 'Bricolage & Outillage'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Visserie & Fixations', id FROM category WHERE name = 'Bricolage & Outillage'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Visserie & Fixations' AND category_uuid = (SELECT id FROM category WHERE name = 'Bricolage & Outillage'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Peinture & Lasure', id FROM category WHERE name = 'Bricolage & Outillage'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Peinture & Lasure' AND category_uuid = (SELECT id FROM category WHERE name = 'Bricolage & Outillage'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Mesure & Traçage', id FROM category WHERE name = 'Bricolage & Outillage'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Mesure & Traçage' AND category_uuid = (SELECT id FROM category WHERE name = 'Bricolage & Outillage'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Échelles & Escabeaux', id FROM category WHERE name = 'Bricolage & Outillage'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Échelles & Escabeaux' AND category_uuid = (SELECT id FROM category WHERE name = 'Bricolage & Outillage'));

-- Livres & Culture
INSERT INTO category (name, img)
SELECT 'Livres & Culture', 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80'
WHERE NOT EXISTS (SELECT 1 FROM category WHERE name = 'Livres & Culture');

INSERT INTO sub_category (name, category_uuid)
SELECT 'Livres scolaires', id FROM category WHERE name = 'Livres & Culture'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Livres scolaires' AND category_uuid = (SELECT id FROM category WHERE name = 'Livres & Culture'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Romans & Littérature', id FROM category WHERE name = 'Livres & Culture'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Romans & Littérature' AND category_uuid = (SELECT id FROM category WHERE name = 'Livres & Culture'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Livres religieux', id FROM category WHERE name = 'Livres & Culture'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Livres religieux' AND category_uuid = (SELECT id FROM category WHERE name = 'Livres & Culture'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'BD & Manga', id FROM category WHERE name = 'Livres & Culture'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'BD & Manga' AND category_uuid = (SELECT id FROM category WHERE name = 'Livres & Culture'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Instruments de musique', id FROM category WHERE name = 'Livres & Culture'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Instruments de musique' AND category_uuid = (SELECT id FROM category WHERE name = 'Livres & Culture'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Loisirs créatifs', id FROM category WHERE name = 'Livres & Culture'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Loisirs créatifs' AND category_uuid = (SELECT id FROM category WHERE name = 'Livres & Culture'));

-- Jouets & Jeux
INSERT INTO category (name, img)
SELECT 'Jouets & Jeux', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'
WHERE NOT EXISTS (SELECT 1 FROM category WHERE name = 'Jouets & Jeux');

INSERT INTO sub_category (name, category_uuid)
SELECT 'Jouets 0-3 ans', id FROM category WHERE name = 'Jouets & Jeux'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Jouets 0-3 ans' AND category_uuid = (SELECT id FROM category WHERE name = 'Jouets & Jeux'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Jouets 3-8 ans', id FROM category WHERE name = 'Jouets & Jeux'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Jouets 3-8 ans' AND category_uuid = (SELECT id FROM category WHERE name = 'Jouets & Jeux'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Jeux de société', id FROM category WHERE name = 'Jouets & Jeux'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Jeux de société' AND category_uuid = (SELECT id FROM category WHERE name = 'Jouets & Jeux'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Jeux éducatifs', id FROM category WHERE name = 'Jouets & Jeux'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Jeux éducatifs' AND category_uuid = (SELECT id FROM category WHERE name = 'Jouets & Jeux'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Jeux d''extérieur', id FROM category WHERE name = 'Jouets & Jeux'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Jeux d''extérieur' AND category_uuid = (SELECT id FROM category WHERE name = 'Jouets & Jeux'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Déguisements & Accessoires', id FROM category WHERE name = 'Jouets & Jeux'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Déguisements & Accessoires' AND category_uuid = (SELECT id FROM category WHERE name = 'Jouets & Jeux'));

-- Animalerie
INSERT INTO category (name, img)
SELECT 'Animalerie', 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80'
WHERE NOT EXISTS (SELECT 1 FROM category WHERE name = 'Animalerie');

INSERT INTO sub_category (name, category_uuid)
SELECT 'Chiens', id FROM category WHERE name = 'Animalerie'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Chiens' AND category_uuid = (SELECT id FROM category WHERE name = 'Animalerie'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Chats', id FROM category WHERE name = 'Animalerie'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Chats' AND category_uuid = (SELECT id FROM category WHERE name = 'Animalerie'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Oiseaux', id FROM category WHERE name = 'Animalerie'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Oiseaux' AND category_uuid = (SELECT id FROM category WHERE name = 'Animalerie'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Rongeurs & Lapins', id FROM category WHERE name = 'Animalerie'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Rongeurs & Lapins' AND category_uuid = (SELECT id FROM category WHERE name = 'Animalerie'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Alimentation animale', id FROM category WHERE name = 'Animalerie'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Alimentation animale' AND category_uuid = (SELECT id FROM category WHERE name = 'Animalerie'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Accessoires animaux', id FROM category WHERE name = 'Animalerie'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Accessoires animaux' AND category_uuid = (SELECT id FROM category WHERE name = 'Animalerie'));

-- Bijoux & Montres (catégorie autonome, complément de la sous-catégorie dans Mode & Beauté)
INSERT INTO category (name, img)
SELECT 'Bijoux & Montres', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80'
WHERE NOT EXISTS (SELECT 1 FROM category WHERE name = 'Bijoux & Montres');

INSERT INTO sub_category (name, category_uuid)
SELECT 'Bagues & Chevalières', id FROM category WHERE name = 'Bijoux & Montres'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Bagues & Chevalières' AND category_uuid = (SELECT id FROM category WHERE name = 'Bijoux & Montres'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Colliers & Pendentifs', id FROM category WHERE name = 'Bijoux & Montres'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Colliers & Pendentifs' AND category_uuid = (SELECT id FROM category WHERE name = 'Bijoux & Montres'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Bracelets', id FROM category WHERE name = 'Bijoux & Montres'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Bracelets' AND category_uuid = (SELECT id FROM category WHERE name = 'Bijoux & Montres'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Boucles d''oreilles', id FROM category WHERE name = 'Bijoux & Montres'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Boucles d''oreilles' AND category_uuid = (SELECT id FROM category WHERE name = 'Bijoux & Montres'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Montres Homme', id FROM category WHERE name = 'Bijoux & Montres'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Montres Homme' AND category_uuid = (SELECT id FROM category WHERE name = 'Bijoux & Montres'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Montres Femme', id FROM category WHERE name = 'Bijoux & Montres'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Montres Femme' AND category_uuid = (SELECT id FROM category WHERE name = 'Bijoux & Montres'));

-- Bagagerie & Voyage
INSERT INTO category (name, img)
SELECT 'Bagagerie & Voyage', 'https://images.unsplash.com/photo-1553603229-2fac68e30cde?w=800&q=80'
WHERE NOT EXISTS (SELECT 1 FROM category WHERE name = 'Bagagerie & Voyage');

INSERT INTO sub_category (name, category_uuid)
SELECT 'Valises', id FROM category WHERE name = 'Bagagerie & Voyage'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Valises' AND category_uuid = (SELECT id FROM category WHERE name = 'Bagagerie & Voyage'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Sacs de voyage', id FROM category WHERE name = 'Bagagerie & Voyage'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Sacs de voyage' AND category_uuid = (SELECT id FROM category WHERE name = 'Bagagerie & Voyage'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Sacs à dos', id FROM category WHERE name = 'Bagagerie & Voyage'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Sacs à dos' AND category_uuid = (SELECT id FROM category WHERE name = 'Bagagerie & Voyage'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Porte-documents & Sacoches', id FROM category WHERE name = 'Bagagerie & Voyage'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Porte-documents & Sacoches' AND category_uuid = (SELECT id FROM category WHERE name = 'Bagagerie & Voyage'));

INSERT INTO sub_category (name, category_uuid)
SELECT 'Accessoires voyage', id FROM category WHERE name = 'Bagagerie & Voyage'
AND NOT EXISTS (SELECT 1 FROM sub_category WHERE name = 'Accessoires voyage' AND category_uuid = (SELECT id FROM category WHERE name = 'Bagagerie & Voyage'));
