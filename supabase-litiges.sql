-- ═══════════════════════════════════════════════════════════
-- TABLE LITIGES / DISPUTES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.disputes (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id     UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    seller_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    motif        TEXT NOT NULL,
    description  TEXT,
    images       TEXT[] DEFAULT '{}',
    status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'rejected', 'resolved')),
    admin_note   TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    resolved_at  TIMESTAMPTZ,
    UNIQUE(order_id) -- une seule réclamation par commande
);

-- Index
CREATE INDEX IF NOT EXISTS disputes_user_id_idx   ON public.disputes(user_id);
CREATE INDEX IF NOT EXISTS disputes_order_id_idx  ON public.disputes(order_id);
CREATE INDEX IF NOT EXISTS disputes_status_idx    ON public.disputes(status);
CREATE INDEX IF NOT EXISTS disputes_created_at_idx ON public.disputes(created_at DESC);

-- RLS
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Le client peut créer et voir ses propres litiges
CREATE POLICY "users_insert_own_disputes" ON public.disputes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_select_own_disputes" ON public.disputes
    FOR SELECT USING (auth.uid() = user_id);

-- Admin et comptable voient tout
CREATE POLICY "admin_all_disputes" ON public.disputes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'comptable')
        )
    );

-- Service role (actions serveur) — accès total
CREATE POLICY "service_role_disputes" ON public.disputes
    FOR ALL USING (true)
    WITH CHECK (true);
