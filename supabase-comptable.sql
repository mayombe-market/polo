-- ════════════════════════════════════════════════════════
-- RÔLE COMPTABLE
-- ════════════════════════════════════════════════════════

-- 1. Ajouter 'comptable' à la contrainte de rôle
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('user', 'vendor', 'admin', 'logistician', 'comptable'));

-- ════════════════════════════════════════════════════════
-- COLONNES PAIEMENTS VENDEURS sur orders
-- ════════════════════════════════════════════════════════

-- Quelle SIM a reçu le paiement du client
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS received_sim TEXT
        CHECK (received_sim IN ('mtn', 'airtel', 'cash', 'autre'));

-- Numéro MoMo du vendeur à qui on a payé
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS payout_phone TEXT;

-- Référence de la transaction MoMo de payout
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS payout_reference TEXT;

-- Date du payout effectué
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS payout_date TIMESTAMPTZ;

-- Note libre de la comptable
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS payout_note TEXT;

-- ════════════════════════════════════════════════════════
-- NUMÉRO MOMO DU VENDEUR sur profiles
-- Pour pré-remplir lors des payouts
-- ════════════════════════════════════════════════════════
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS payout_phone TEXT;

-- ════════════════════════════════════════════════════════
-- TABLE : bank_transfers
-- Chaque virement MoMo → banque enregistré par la comptable
-- ════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.bank_transfers (
    id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    amount          BIGINT      NOT NULL,
    sim_operator    TEXT        NOT NULL CHECK (sim_operator IN ('mtn', 'airtel', 'autre')),
    from_number     TEXT,
    to_bank         TEXT        NOT NULL,
    reference       TEXT,
    note            TEXT,
    transferred_by  UUID        REFERENCES public.profiles(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bank_transfers ENABLE ROW LEVEL SECURITY;

-- Comptable et admin peuvent tout faire
CREATE POLICY "comptable_all" ON public.bank_transfers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'comptable')
        )
    );
