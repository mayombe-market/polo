-- ================================================================
-- CLEANUP IMMOBILIER — suppression des sous-catégories obsolètes
-- ================================================================
-- À exécuter une fois dans le SQL Editor Supabase pour retirer
-- définitivement les entrées héritées du seed v1 :
--   - Terrains & Parcelles
--   - Maisons & Villas (Vente)
--   - Locations (Maisons, Studios, Chambres)
--   - Commerces & Bureaux (Magasins à louer)
--
-- Ces noms ont été remplacés par le set canonique :
--   Maisons, Appartements, Terrains, Luxe, Hôtels, Villas, Locations
--
-- Sécurisé : ne touche que la catégorie "Immobilier" et uniquement
-- les 4 lignes listées ci-dessus. Les produits éventuellement liés
-- via `sub_category_uuid` verront leur lien cassé (sub_category_uuid
-- devient orphelin) — reassignez-les manuellement si besoin.
-- ================================================================

DELETE FROM sub_category
WHERE name IN (
    'Terrains & Parcelles',
    'Maisons & Villas (Vente)',
    'Locations (Maisons, Studios, Chambres)',
    'Commerces & Bureaux (Magasins à louer)'
)
AND category_uuid IN (
    SELECT id FROM category WHERE name ILIKE 'immobilier'
);

-- Vérification : liste les sous-catégories restantes d'Immobilier
SELECT sc.id, sc.name
FROM sub_category sc
JOIN category c ON c.id = sc.category_uuid
WHERE c.name ILIKE 'immobilier'
ORDER BY sc.name;
