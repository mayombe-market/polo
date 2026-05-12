-- ═══════════════════════════════════════════════════════════════════════════
-- Migration : Combos / options produit (pâtisserie)
-- À exécuter dans Supabase : SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Options sur les produits
--    Structure JSON : [{ id, name, required, choices: [{ id, name, price }] }]
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS options jsonb DEFAULT '[]';

COMMENT ON COLUMN public.products.options IS
  'Groupes d''options/combos du produit. JSON : [{id, name, required, choices:[{id,name,price}]}]';

-- 2. Options sélectionnées dans le panier
--    Structure JSON : [{ groupId, groupName, choiceId, choiceName, price }]
ALTER TABLE public.cart
  ADD COLUMN IF NOT EXISTS selected_options jsonb;

COMMENT ON COLUMN public.cart.selected_options IS
  'Options/combos choisis par le client pour cet article. JSON : [{groupId,groupName,choiceId,choiceName,price}]';
