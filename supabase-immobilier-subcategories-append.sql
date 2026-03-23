-- Mayombe Market — Immobilier : ne garder que les 4 sous-catégories stratégiques
-- (aligné sur lib/realEstateListing.ts — IMMOBILIER_SUBCATEGORIES)
--
-- 1) Détache les annonces qui pointaient vers une sous-catégorie Immobilier supprimée
-- 2) Supprime toutes les sous-catégories Immobilier dont le nom n’est pas dans la liste
-- 3) Insère les 4 noms manquants
--
-- Prérequis : la ligne category « Immobilier » existe.

-- ─── Noms conservés (doivent matcher exactement le code) ───
-- Terrains & Parcelles
-- Maisons & Villas (Vente)
-- Locations (Maisons, Studios, Chambres)
-- Commerces & Bureaux (Magasins à louer)

-- 1. Produits : retirer le lien FK vers une sous-catégorie Immobilier obsolète
UPDATE products p
SET sub_category_uuid = NULL
FROM sub_category sc
JOIN category cat ON cat.id = sc.category_uuid
WHERE p.sub_category_uuid = sc.id
  AND cat.name = 'Immobilier'
  AND sc.name NOT IN (
    'Terrains & Parcelles',
    'Maisons & Villas (Vente)',
    'Locations (Maisons, Studios, Chambres)',
    'Commerces & Bureaux (Magasins à louer)'
  );

-- 2. Supprimer les sous-catégories Immobilier hors liste
DELETE FROM sub_category sc
USING category c
WHERE sc.category_uuid = c.id
  AND c.name = 'Immobilier'
  AND sc.name NOT IN (
    'Terrains & Parcelles',
    'Maisons & Villas (Vente)',
    'Locations (Maisons, Studios, Chambres)',
    'Commerces & Bureaux (Magasins à louer)'
  );

-- 3. Ajouter les 4 sous-catégories si elles n’existent pas encore
INSERT INTO sub_category (name, category_uuid)
SELECT x.name, c.id
FROM category c
CROSS JOIN (
    VALUES
        ('Terrains & Parcelles'),
        ('Maisons & Villas (Vente)'),
        ('Locations (Maisons, Studios, Chambres)'),
        ('Commerces & Bureaux (Magasins à louer)')
) AS x(name)
WHERE c.name = 'Immobilier'
  AND NOT EXISTS (
    SELECT 1
    FROM sub_category sc
    WHERE sc.category_uuid = c.id
      AND sc.name = x.name
  );
