-- ═══════════════════════════════════════════════════════════════════════════
-- Mayombe Market — Bucket `products` : limite de taille fichier (Storage)
--
-- Le script principal `supabase-vendors-storage-and-profiles-unlock.sql` crée le bucket
-- avec seulement (id, name, public) → `file_size_limit` reste NULL = défaut **projet**
-- Supabase (souvent 50 Mo sur les offres récentes), **pas** une limite à 1 Mo dans le SQL.
--
-- Si dans le Dashboard (Storage → products → Configuration) une limite trop basse a été
-- définie, les uploads peuvent échouer **côté serveur** (erreur Storage), indépendamment
-- du timeout client (2 min). Ce script remet une marge confortable.
--
-- Exécuter dans Supabase → SQL Editor si besoin.
-- ═══════════════════════════════════════════════════════════════════════════

-- 50 Mo par objet (l’app limite déjà à 5 Mo par image côté client + compression)
UPDATE storage.buckets
SET file_size_limit = 52428800
WHERE id = 'products';

-- Option : laisser le plafond du plan Supabase (décommenter si vous préférez)
-- UPDATE storage.buckets SET file_size_limit = NULL WHERE id = 'products';
