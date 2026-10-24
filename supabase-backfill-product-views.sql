-- ═══════════════════════════════════════════════════════════════════════════
-- Mayombe Market — Récupérer les vues produit déjà enregistrées (2026-10-24)
-- Les visites étaient bien notées dans analytics_events, mais products.views_count
-- n'était jamais augmenté (fonction increment_product_views absente).
-- Met à jour le compteur uniquement s'il est plus bas que le nombre réel de vues.
-- Aucune suppression. À exécuter dans Supabase : SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE public.products AS p
SET views_count = v.total
FROM (
    SELECT product_id, count(*) AS total
    FROM public.analytics_events
    WHERE event_type = 'product_view' AND product_id IS NOT NULL
    GROUP BY product_id
) AS v
WHERE p.id = v.product_id
  AND COALESCE(p.views_count, 0) < v.total;

-- Vérification : les 10 produits les plus vus
SELECT name, views_count FROM public.products ORDER BY views_count DESC NULLS LAST LIMIT 10;
