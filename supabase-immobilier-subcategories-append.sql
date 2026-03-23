-- Mayombe Market — Sous-catégories Immobilier (ajout sans supprimer les anciennes)
-- Exécuter après que la ligne category « Immobilier » existe (voir supabase-categories-seed.sql).

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
