-- =====================================================================
-- MAYOMBE MARKET — PROGRAMME FIDÉLITÉ (LOYALTY POINTS)
-- =====================================================================
-- Fichier : supabase-loyalty-schema.sql
-- Rôle    : schéma tables + enum + RLS + index + trigger auto-credit
-- À exécuter AVANT supabase-loyalty-rpc.sql et supabase-loyalty-cron.sql
--
-- Règles métier (verrouillées) :
--   - Gain   : 10% de orders.commission_amount, crédité à la livraison
--   - Pending window : 48h (aligné sur admin_release_funds)
--   - Expiration     : 4 mois après passage en 'available'
--   - Seuil usage    : 1 000 FCFA
--   - Unité          : FCFA entiers (pas de décimales)
--   - Source de vérité : table loyalty_transactions (append-only)
--   - Vue matérialisée rapide : table loyalty_accounts
--
-- Note : la colonne profiles.loyalty_points existante N'EST PAS utilisée
--        par ce système. On la laisse en place pour rétro-compat.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ENUM des types de transactions
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'loyalty_tx_type') then
    create type loyalty_tx_type as enum (
      'earn_pending',      -- +X à la livraison
      'earn_available',    -- déplacement pending → available (après 48h)
      'spend',             -- -X au checkout
      'revoke_pending',    -- -X retour dans la fenêtre 48h (points encore pending)
      'revoke_available',  -- -X retour après 48h (points available pas encore dépensés)
      'expire',            -- -X cron expiration
      'admin_adjust'       -- +/- ajustement manuel admin
    );
  end if;
end$$;

-- ---------------------------------------------------------------------
-- 2. Table loyalty_accounts (balances — 1 ligne par user)
-- ---------------------------------------------------------------------
create table if not exists public.loyalty_accounts (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  balance_pending    integer not null default 0 check (balance_pending >= 0),
  balance_available  integer not null default 0 check (balance_available >= 0),
  lifetime_earned    integer not null default 0 check (lifetime_earned >= 0),
  lifetime_spent     integer not null default 0 check (lifetime_spent >= 0),
  lifetime_expired   integer not null default 0 check (lifetime_expired >= 0),
  lifetime_revoked   integer not null default 0 check (lifetime_revoked >= 0),
  updated_at         timestamptz not null default now()
);

comment on table public.loyalty_accounts is
  'Balances fidélité par utilisateur. Vue rapide — source de vérité = loyalty_transactions.';
comment on column public.loyalty_accounts.balance_pending is
  'Points gagnés à la livraison mais pas encore utilisables (fenêtre 48h).';
comment on column public.loyalty_accounts.balance_available is
  'Points utilisables immédiatement au checkout (seuil mini 1000 FCFA).';

-- ---------------------------------------------------------------------
-- 3. Table loyalty_transactions (historique immuable — source de vérité)
-- ---------------------------------------------------------------------
create table if not exists public.loyalty_transactions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references public.profiles(id) on delete restrict,
  order_id                 uuid references public.orders(id) on delete set null,
  type                     loyalty_tx_type not null,
  amount                   integer not null,  -- signé : gain positif, dépense/expire/revoke négatif
  balance_after_pending    integer not null,  -- snapshot après la tx
  balance_after_available  integer not null,  -- snapshot après la tx
  expires_at               timestamptz,       -- rempli si type = 'earn_available'
  consumed_at              timestamptz,       -- rempli si une 'spend' / 'expire' a consommé cette ligne source
  reason                   text not null,
  metadata                 jsonb not null default '{}'::jsonb,
  created_by               uuid references public.profiles(id), -- null = système, sinon admin
  created_at               timestamptz not null default now()
);

comment on table public.loyalty_transactions is
  'Historique immuable des mouvements de points. Append-only. Source de vérité.';
comment on column public.loyalty_transactions.expires_at is
  'Uniquement sur earn_available : date d''expiration des points (4 mois après le earn).';
comment on column public.loyalty_transactions.consumed_at is
  'Uniquement sur earn_available : marque quand la ligne source a été entièrement consommée (spend/expire/revoke).';

-- Index critiques
create index if not exists idx_loyalty_tx_user_time
  on public.loyalty_transactions (user_id, created_at desc);

create index if not exists idx_loyalty_tx_expires_unconsumed
  on public.loyalty_transactions (expires_at)
  where type = 'earn_available' and consumed_at is null;

create index if not exists idx_loyalty_tx_order
  on public.loyalty_transactions (order_id)
  where order_id is not null;

create index if not exists idx_loyalty_tx_earn_available_fifo
  on public.loyalty_transactions (user_id, expires_at asc)
  where type = 'earn_available' and consumed_at is null;

-- ---------------------------------------------------------------------
-- 4. Colonnes loyalty sur orders
-- ---------------------------------------------------------------------
alter table public.orders
  add column if not exists loyalty_points_earned  integer not null default 0 check (loyalty_points_earned >= 0);

alter table public.orders
  add column if not exists loyalty_points_used    integer not null default 0 check (loyalty_points_used >= 0);

alter table public.orders
  add column if not exists loyalty_credited_at    timestamptz;

alter table public.orders
  add column if not exists loyalty_available_at   timestamptz;

comment on column public.orders.loyalty_points_earned is
  'Points (FCFA) crédités au client pour cette commande (remplis à delivered).';
comment on column public.orders.loyalty_points_used is
  'Points (FCFA) utilisés par le client au checkout sur cette commande.';
comment on column public.orders.loyalty_credited_at is
  'Date du crédit en pending (= delivered_at en pratique).';
comment on column public.orders.loyalty_available_at is
  'Date de passage pending → available (credited_at + 48h, via cron).';

-- ---------------------------------------------------------------------
-- 5. RLS (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.loyalty_accounts enable row level security;
alter table public.loyalty_transactions enable row level security;

-- Policies loyalty_accounts
drop policy if exists "loyalty_accounts_select_own" on public.loyalty_accounts;
create policy "loyalty_accounts_select_own"
  on public.loyalty_accounts
  for select
  using (user_id = auth.uid());

drop policy if exists "loyalty_accounts_select_admin" on public.loyalty_accounts;
create policy "loyalty_accounts_select_admin"
  on public.loyalty_accounts
  for select
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ));

-- Aucune policy INSERT/UPDATE/DELETE → seul service_role (via RPC) peut modifier

-- Policies loyalty_transactions
drop policy if exists "loyalty_tx_select_own" on public.loyalty_transactions;
create policy "loyalty_tx_select_own"
  on public.loyalty_transactions
  for select
  using (user_id = auth.uid());

drop policy if exists "loyalty_tx_select_admin" on public.loyalty_transactions;
create policy "loyalty_tx_select_admin"
  on public.loyalty_transactions
  for select
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ));

-- Pas d'INSERT/UPDATE/DELETE par policies : tout passe par les RPCs security definer

-- ---------------------------------------------------------------------
-- 6. Trigger auto-credit à la livraison
-- ---------------------------------------------------------------------
-- Filet de sécurité : dès que orders.status bascule en 'delivered',
-- on appelle la RPC loyalty_credit_on_delivery (idempotente).
-- Défini dans supabase-loyalty-rpc.sql, donc ce trigger doit être créé
-- APRÈS l'exécution du fichier rpc.
--
-- (Fonction trigger déclarée dans rpc.sql pour rester groupée.)

-- ---------------------------------------------------------------------
-- 7. Bootstrap : initialiser loyalty_accounts pour les users existants
-- ---------------------------------------------------------------------
insert into public.loyalty_accounts (user_id)
select id from public.profiles
where id not in (select user_id from public.loyalty_accounts)
on conflict (user_id) do nothing;

-- Auto-création à l'inscription : trigger sur profiles
create or replace function public.loyalty_ensure_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.loyalty_accounts (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_loyalty_ensure_account on public.profiles;
create trigger trg_loyalty_ensure_account
  after insert on public.profiles
  for each row
  execute function public.loyalty_ensure_account();

-- =====================================================================
-- FIN supabase-loyalty-schema.sql
-- =====================================================================
