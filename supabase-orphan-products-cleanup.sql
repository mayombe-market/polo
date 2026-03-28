-- Mayombe Market — Produits créés avec seller_id NULL (ex. bypass session / bug client)
-- À exécuter dans Supabase → SQL Editor (réviser avant DELETE).

-- 1) Diagnostic : lignes concernées
SELECT id, name, created_at, img, seller_id
FROM public.products
WHERE seller_id IS NULL
ORDER BY created_at DESC;

-- 2) Option recommandée : suppression des brouillons orphelins (décommenter si OK)
-- DELETE FROM public.products
-- WHERE seller_id IS NULL;

-- 3) Option rare : rattacher manuellement au bon vendeur (remplacer UUID et id produit)
-- UPDATE public.products
-- SET seller_id = '00000000-0000-0000-0000-000000000000'::uuid
-- WHERE id = '...' AND seller_id IS NULL;
