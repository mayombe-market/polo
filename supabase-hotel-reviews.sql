-- ════════════════════════════════════════════════════════
-- COLONNE : réponse hôtelier sur un avis existant
-- ════════════════════════════════════════════════════════
ALTER TABLE public.reviews
    ADD COLUMN IF NOT EXISTS hotel_reply      TEXT,
    ADD COLUMN IF NOT EXISTS hotel_reply_at   TIMESTAMPTZ;

-- ════════════════════════════════════════════════════════
-- TABLE : hotel_review_requests
-- Une demande d'avis créée par le personnel hôtelier.
-- Le token est envoyé par email au client à la sortie.
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.hotel_review_requests (
    id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    token        UUID        DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    hotel_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id   UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    guest_name   TEXT,
    guest_email  TEXT        NOT NULL,
    status       TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'completed', 'expired')),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Index pour chercher rapidement par token (page guest)
CREATE INDEX IF NOT EXISTS hotel_review_requests_token_idx
    ON public.hotel_review_requests(token);

-- Index pour lister les demandes d'un hôtel dans le dashboard
CREATE INDEX IF NOT EXISTS hotel_review_requests_hotel_idx
    ON public.hotel_review_requests(hotel_id, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────
ALTER TABLE public.hotel_review_requests ENABLE ROW LEVEL SECURITY;

-- L'hôtelier peut créer et voir ses propres demandes
CREATE POLICY "hotel_staff_insert" ON public.hotel_review_requests
    FOR INSERT WITH CHECK (hotel_id = auth.uid());

CREATE POLICY "hotel_staff_select" ON public.hotel_review_requests
    FOR SELECT USING (hotel_id = auth.uid());

-- Lecture publique par token (pour la page guest, pas de user connecté)
CREATE POLICY "guest_select_by_token" ON public.hotel_review_requests
    FOR SELECT USING (true);   -- filtrage par token dans la requête, pas par user

-- Le guest (via server action, role service_role) peut mettre à jour le statut
CREATE POLICY "service_update_status" ON public.hotel_review_requests
    FOR UPDATE USING (true);

-- Admin peut tout voir
CREATE POLICY "admin_all" ON public.hotel_review_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
