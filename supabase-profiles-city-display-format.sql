-- À exécuter dans le SQL Editor Supabase (avant / après déploiement du code).
-- Unifie profiles.city au format affichage DELIVERY_CITY_LIST.

UPDATE profiles SET city = 'Brazzaville' WHERE city = 'brazzaville';
UPDATE profiles SET city = 'Pointe-Noire' WHERE city = 'pointe-noire';

-- Vérification :
-- SELECT city, COUNT(*) FROM profiles GROUP BY city ORDER BY city;
