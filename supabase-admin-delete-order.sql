-- ═══════════════════════════════════════════════════════════════
-- Mayombe Market — Admin : suppression de commandes
-- À exécuter dans le SQL Editor Supabase (une fois)
-- ═══════════════════════════════════════════════════════════════

-- 1) Les notes liées à une commande sont supprimées en cascade avec la commande
ALTER TABLE public.ratings DROP CONSTRAINT IF EXISTS ratings_order_id_fkey;

ALTER TABLE public.ratings
  ADD CONSTRAINT ratings_order_id_fkey
  FOREIGN KEY (order_id)
  REFERENCES public.orders(id)
  ON DELETE CASCADE;

-- 2) RLS : seul un admin peut supprimer une ligne dans orders
-- (ignorer si la policy existe déjà)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'Admin supprime commandes'
  ) THEN
    CREATE POLICY "Admin supprime commandes" ON public.orders
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

COMMENT ON POLICY "Admin supprime commandes" ON public.orders IS
  'Permet aux admins de retirer une commande de la base (ex. doublon, test).';
