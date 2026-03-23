-- Mayombe Market — Colonne JSON pour annonces immobilières (sans casser les produits classiques)
-- À exécuter une fois dans Supabase → SQL Editor.
--
-- Stocke les champs spécifiques (vente/location, quartier, surface, statut foncier, etc.)
-- pour category = 'Immobilier'. Les autres catégories gardent listing_extras = {}.

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS listing_extras jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.products.listing_extras IS
'Données optionnelles typées (ex. immobilier version:1). Produits classiques : objet vide {}.';
