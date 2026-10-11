-- ═══════════════════════════════════════════════════════════════════════════
-- DIAGNOSTIC VÉRIFICATION VENDEUR — LECTURE SEULE
-- Colle ce script dans Supabase > SQL Editor et exécute-le.
-- Aucune donnée n'est modifiée.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Est-ce que la table vendor_verifications existe ?
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'vendor_verifications';

-- 2. Colonnes présentes dans vendor_verifications
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'vendor_verifications'
ORDER BY ordinal_position;

-- 3. Contraintes (CHECK, UNIQUE, NOT NULL) sur vendor_verifications
SELECT
    con.conname   AS constraint_name,
    con.contype   AS type,          -- c=check, u=unique, p=primary, f=foreign
    pg_get_constraintdef(con.oid)   AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'vendor_verifications';

-- 4. RLS activé sur vendor_verifications ?
SELECT
    relname          AS table_name,
    relrowsecurity   AS rls_enabled
FROM pg_class
WHERE relname = 'vendor_verifications'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 5. Politiques RLS existantes sur vendor_verifications
SELECT
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'vendor_verifications'
ORDER BY policyname;

-- 6. Fonctions RPC approve / reject existent-elles ?
SELECT
    p.proname       AS function_name,
    p.prosecdef     AS security_definer,
    pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('approve_vendor_verification', 'reject_vendor_verification');

-- 7. Colonne verification_status sur profiles existe-t-elle ?
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'verification_status';

-- 8. Bucket Supabase Storage pour les documents vendeurs
SELECT
    id,
    name,
    public
FROM storage.buckets
WHERE name = 'vendor-verifications';

-- 9. Politiques storage sur vendor-verifications
SELECT
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname ILIKE '%vendor%'
ORDER BY policyname;

-- 10. Nombre de demandes par statut (résumé non destructif)
SELECT
    status,
    COUNT(*) AS nb
FROM vendor_verifications
GROUP BY status
ORDER BY status;
