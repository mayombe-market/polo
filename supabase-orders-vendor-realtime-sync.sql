-- ═══════════════════════════════════════════════════════════════════════════
-- Mayombe Market — Sync vendeur / acheteur après confirmation admin
--
-- Problème fréquent : l’admin voit le statut à jour (mise à jour locale dans l’UI)
-- mais le vendeur et l’acheteur ne reçoivent pas l’événement temps réel car :
--   1) La table `orders` n’est pas dans la publication `supabase_realtime`, OU
--   2) Le vendeur n’a aucune policy RLS SELECT sur `orders` → Realtime ne lui envoie rien.
--
-- À exécuter une fois dans Supabase → SQL Editor (idempotent autant que possible).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1) Realtime sur public.orders ───────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    RAISE NOTICE '[Mayombe] Table public.orders ajoutée à supabase_realtime.';
  ELSE
    RAISE NOTICE '[Mayombe] public.orders est déjà dans supabase_realtime.';
  END IF;
END $$;

-- ─── 2) RLS : le vendeur peut LIRE les commandes qui contiennent ses lignes ─
-- (indispensable pour postgres_changes côté navigateur + cohérence avec getVendorOrders)
DROP POLICY IF EXISTS "Vendeur voit commandes avec ses articles" ON public.orders;

CREATE POLICY "Vendeur voit commandes avec ses articles" ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'vendor'
    )
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        COALESCE(items::jsonb, '[]'::jsonb)
      ) AS elem
      WHERE (elem->>'seller_id') IS NOT NULL
        AND (elem->>'seller_id') = auth.uid()::text
    )
  );

COMMENT ON POLICY "Vendeur voit commandes avec ses articles" ON public.orders IS
  'Permet au vendeur de voir (et recevoir en Realtime) les commandes contenant au moins un article à lui.';
