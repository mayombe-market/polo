-- Ajoute la colonne compare_price (ancien prix barré) pour la fonctionnalité
-- de pricing psychologique réservée aux vendeurs pro et premium.
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_price integer DEFAULT NULL;
