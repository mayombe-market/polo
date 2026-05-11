-- ═══════════════════════════════════════════════════════════════════════════
-- Migration : Pâtisserie "Boutique d'abord" — squelette Uber Eats (v2)
-- À exécuter dans Supabase : SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Table products : description + sous-catégorie ────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS description  text,
  ADD COLUMN IF NOT EXISTS subcategory  text;

COMMENT ON COLUMN public.products.description IS
  'Description courte affichée dans la fiche produit (ex: Génoise, chantilly, cerises...)';
COMMENT ON COLUMN public.products.subcategory IS
  'Sous-catégorie dans la vue boutique (ex: Gâteaux, Cupcakes, Mariages…)';

-- ── Table profiles : tous les champs boutique ────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_image        text,
  ADD COLUMN IF NOT EXISTS delivery_time      text    DEFAULT '30-60 min',
  ADD COLUMN IF NOT EXISTS min_order          int     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee       int     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opening_hours_text text,
  ADD COLUMN IF NOT EXISTS is_open            boolean DEFAULT true;

COMMENT ON COLUMN public.profiles.cover_image IS
  'URL de la grande photo bannière en haut de la page boutique';
COMMENT ON COLUMN public.profiles.delivery_time IS
  'Délai de livraison estimé, ex: "30-60 min"';
COMMENT ON COLUMN public.profiles.min_order IS
  'Commande minimum en FCFA (0 = pas de minimum)';
COMMENT ON COLUMN public.profiles.delivery_fee IS
  'Frais de livraison en FCFA (0 = livraison gratuite)';
COMMENT ON COLUMN public.profiles.opening_hours_text IS
  'Horaires lisibles, ex: "Lun-Sam 8h-20h, Dim 9h-14h"';
COMMENT ON COLUMN public.profiles.is_open IS
  'true = boutique ouverte, false = overlay "Fermée" affiché';

-- ── Index performance ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_subcategory
  ON public.products(subcategory);
CREATE INDEX IF NOT EXISTS idx_products_seller_category
  ON public.products(seller_id, category);
CREATE INDEX IF NOT EXISTS idx_profiles_is_open
  ON public.profiles(is_open) WHERE is_open = false;
