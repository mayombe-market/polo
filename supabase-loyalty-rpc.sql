-- =====================================================================
-- MAYOMBE MARKET — PROGRAMME FIDÉLITÉ (RPCs)
-- =====================================================================
-- Fichier : supabase-loyalty-rpc.sql
-- Rôle    : fonctions atomiques (credit, promote, revoke, expire, spend, adjust)
-- Dépend  : supabase-loyalty-schema.sql (à exécuter AVANT)
--
-- Convention :
--   - Toutes les fonctions sont SECURITY DEFINER → contournent RLS.
--   - Toutes les fonctions prennent un LOCK (for update) sur loyalty_accounts.
--   - Toutes les opérations = transaction atomique (tx SQL implicite dans la fonction).
--   - Idempotence quand applicable (crédit : vérif loyalty_credited_at IS NULL).
-- =====================================================================

-- ---------------------------------------------------------------------
-- CONSTANTES métier (centralisées)
-- ---------------------------------------------------------------------
-- Ces valeurs sont dupliquées dans lib/loyalty/rules.ts côté TS.
-- Si tu changes ici, change AUSSI dans rules.ts.
--
--   LOYALTY_RATE_ON_COMMISSION = 0.10  (10% de commission_amount)
--   PENDING_WINDOW_HOURS       = 48
--   EXPIRATION_MONTHS          = 4
--   USE_THRESHOLD_FCFA         = 1000

-- =====================================================================
-- RPC 1 : loyalty_credit_on_delivery
-- =====================================================================
-- Appelée automatiquement par trigger quand orders.status bascule en 'delivered'.
-- Idempotente : ne crédite qu'une seule fois (vérif loyalty_credited_at).
create or replace function public.loyalty_credit_on_delivery(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order       record;
  v_points      integer;
  v_acc         record;
begin
  -- Charger la commande
  select id, user_id, commission_amount, status, loyalty_credited_at, delivered_at
    into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'loyalty_credit_on_delivery: order % not found', p_order_id;
  end if;

  -- Idempotence
  if v_order.loyalty_credited_at is not null then
    return;
  end if;

  -- Sanity : status doit être delivered
  if v_order.status <> 'delivered' then
    raise exception 'loyalty_credit_on_delivery: order % not delivered (status=%)', p_order_id, v_order.status;
  end if;

  -- Calcul : 10% de la commission (arrondi entier)
  v_points := round(coalesce(v_order.commission_amount, 0) * 0.10);

  -- Si 0 point (commande gratuite ou sans commission), on marque quand même comme "traité"
  if v_points <= 0 then
    update public.orders
       set loyalty_credited_at = now(),
           loyalty_points_earned = 0
     where id = p_order_id;
    return;
  end if;

  -- Lock du compte (crée si absent)
  insert into public.loyalty_accounts (user_id)
  values (v_order.user_id)
  on conflict (user_id) do nothing;

  select * into v_acc
    from public.loyalty_accounts
   where user_id = v_order.user_id
   for update;

  -- Mise à jour balances
  update public.loyalty_accounts
     set balance_pending = balance_pending + v_points,
         lifetime_earned = lifetime_earned + v_points,
         updated_at = now()
   where user_id = v_order.user_id
   returning * into v_acc;

  -- Audit trail
  insert into public.loyalty_transactions (
    user_id, order_id, type, amount,
    balance_after_pending, balance_after_available,
    reason, metadata
  ) values (
    v_order.user_id, p_order_id, 'earn_pending', v_points,
    v_acc.balance_pending, v_acc.balance_available,
    'Crédit à la livraison (10% commission)',
    jsonb_build_object('commission_amount', v_order.commission_amount)
  );

  -- Marquer la commande
  update public.orders
     set loyalty_credited_at = now(),
         loyalty_points_earned = v_points
   where id = p_order_id;
end;
$$;

-- =====================================================================
-- Trigger : auto-credit dès que status passe à 'delivered'
-- =====================================================================
create or replace function public.loyalty_trg_on_delivered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'delivered'
     and (old.status is distinct from 'delivered')
     and new.loyalty_credited_at is null then
    perform public.loyalty_credit_on_delivery(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_loyalty_on_delivered on public.orders;
create trigger trg_loyalty_on_delivered
  after update of status on public.orders
  for each row
  execute function public.loyalty_trg_on_delivered();

-- =====================================================================
-- RPC 2 : loyalty_promote_pending_to_available
-- =====================================================================
-- Appelée par pg_cron 1×/jour. Passe pending → available après 48h.
-- Batchée par 500 pour éviter locks longs.
create or replace function public.loyalty_promote_pending_to_available()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order     record;
  v_points    integer;
  v_acc       record;
  v_expires   timestamptz;
  v_count     integer := 0;
begin
  for v_order in
    select id, user_id, loyalty_points_earned
      from public.orders
     where status = 'delivered'
       and loyalty_credited_at is not null
       and loyalty_credited_at < now() - interval '48 hours'
       and loyalty_available_at is null
       and loyalty_points_earned > 0
     order by loyalty_credited_at asc
     limit 500
  loop
    v_points := v_order.loyalty_points_earned;
    v_expires := now() + interval '4 months';

    -- Lock compte
    select * into v_acc
      from public.loyalty_accounts
     where user_id = v_order.user_id
     for update;

    if not found then
      continue;
    end if;

    -- Déplacer pending → available
    update public.loyalty_accounts
       set balance_pending   = greatest(balance_pending - v_points, 0),
           balance_available = balance_available + v_points,
           updated_at = now()
     where user_id = v_order.user_id
     returning * into v_acc;

    -- Audit trail : earn_available avec expires_at
    insert into public.loyalty_transactions (
      user_id, order_id, type, amount,
      balance_after_pending, balance_after_available,
      expires_at, reason
    ) values (
      v_order.user_id, v_order.id, 'earn_available', v_points,
      v_acc.balance_pending, v_acc.balance_available,
      v_expires, 'Déblocage après fenêtre 48h'
    );

    update public.orders
       set loyalty_available_at = now()
     where id = v_order.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- =====================================================================
-- RPC 3 : loyalty_revoke_on_return
-- =====================================================================
-- Appelée par le (futur) flow de retour/annulation post-livraison.
-- Pas branchée actuellement — Mayombe Market n'a pas de flow return pour l'instant.
-- Prête pour l'avenir.
create or replace function public.loyalty_revoke_on_return(
  p_order_id uuid,
  p_reason   text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order         record;
  v_earned        integer;
  v_still_pending boolean;
  v_still_in_avail integer := 0;
  v_to_revoke     integer;
  v_acc           record;
begin
  select id, user_id, loyalty_points_earned, loyalty_credited_at, loyalty_available_at
    into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'loyalty_revoke_on_return: order % not found', p_order_id;
  end if;

  v_earned := coalesce(v_order.loyalty_points_earned, 0);
  if v_earned <= 0 then
    return;
  end if;

  -- Cas A : points encore en pending (retour dans les 48h)
  v_still_pending := (v_order.loyalty_available_at is null);

  select * into v_acc
    from public.loyalty_accounts
   where user_id = v_order.user_id
   for update;

  if v_still_pending then
    v_to_revoke := least(v_earned, v_acc.balance_pending);
    if v_to_revoke > 0 then
      update public.loyalty_accounts
         set balance_pending = balance_pending - v_to_revoke,
             lifetime_revoked = lifetime_revoked + v_to_revoke,
             updated_at = now()
       where user_id = v_order.user_id
       returning * into v_acc;

      insert into public.loyalty_transactions (
        user_id, order_id, type, amount,
        balance_after_pending, balance_after_available,
        reason
      ) values (
        v_order.user_id, p_order_id, 'revoke_pending', -v_to_revoke,
        v_acc.balance_pending, v_acc.balance_available,
        coalesce(p_reason, 'Retour / annulation pendant fenêtre 48h')
      );
    end if;
    return;
  end if;

  -- Cas B : points déjà available → vérifier combien sont encore "non consommés"
  select coalesce(sum(amount), 0)
    into v_still_in_avail
    from public.loyalty_transactions
   where order_id = p_order_id
     and type = 'earn_available'
     and consumed_at is null;

  v_to_revoke := least(v_still_in_avail, v_acc.balance_available);

  if v_to_revoke > 0 then
    update public.loyalty_accounts
       set balance_available = balance_available - v_to_revoke,
           lifetime_revoked = lifetime_revoked + v_to_revoke,
           updated_at = now()
     where user_id = v_order.user_id
     returning * into v_acc;

    -- Marquer les lignes source comme consommées
    update public.loyalty_transactions
       set consumed_at = now(),
           metadata = metadata || jsonb_build_object('revoked_reason', coalesce(p_reason, 'return'))
     where order_id = p_order_id
       and type = 'earn_available'
       and consumed_at is null;

    insert into public.loyalty_transactions (
      user_id, order_id, type, amount,
      balance_after_pending, balance_after_available,
      reason
    ) values (
      v_order.user_id, p_order_id, 'revoke_available', -v_to_revoke,
      v_acc.balance_pending, v_acc.balance_available,
      coalesce(p_reason, 'Retour / annulation après fenêtre 48h')
    );
  end if;

  -- Cas C : (v_earned - v_to_revoke) points ont déjà été dépensés → absorbé par Mayombe
  if (v_earned - v_to_revoke) > 0 then
    insert into public.loyalty_transactions (
      user_id, order_id, type, amount,
      balance_after_pending, balance_after_available,
      reason, metadata
    ) values (
      v_order.user_id, p_order_id, 'admin_adjust', 0,
      v_acc.balance_pending, v_acc.balance_available,
      'Retour : points déjà dépensés — absorbé par Mayombe Market',
      jsonb_build_object(
        'absorbed_by_platform', true,
        'amount_absorbed', v_earned - v_to_revoke,
        'return_reason', coalesce(p_reason, 'return')
      )
    );
  end if;
end;
$$;

-- =====================================================================
-- RPC 4 : loyalty_expire_points
-- =====================================================================
-- Cron quotidien. Expire les lignes earn_available dont expires_at < now().
create or replace function public.loyalty_expire_points()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   uuid;
  v_total     integer;
  v_acc       record;
  v_count     integer := 0;
begin
  for v_user_id, v_total in
    select user_id, sum(amount)
      from public.loyalty_transactions
     where type = 'earn_available'
       and consumed_at is null
       and expires_at is not null
       and expires_at < now()
     group by user_id
  loop
    if v_total <= 0 then
      continue;
    end if;

    select * into v_acc
      from public.loyalty_accounts
     where user_id = v_user_id
     for update;

    if not found then
      continue;
    end if;

    -- On ne peut pas expirer plus que la balance available réelle
    v_total := least(v_total, v_acc.balance_available);
    if v_total <= 0 then
      -- Juste marquer les lignes comme consommées (cas où déjà dépensées)
      update public.loyalty_transactions
         set consumed_at = now()
       where user_id = v_user_id
         and type = 'earn_available'
         and consumed_at is null
         and expires_at < now();
      continue;
    end if;

    update public.loyalty_accounts
       set balance_available = balance_available - v_total,
           lifetime_expired = lifetime_expired + v_total,
           updated_at = now()
     where user_id = v_user_id
     returning * into v_acc;

    -- Marquer les lignes source comme consommées
    update public.loyalty_transactions
       set consumed_at = now()
     where user_id = v_user_id
       and type = 'earn_available'
       and consumed_at is null
       and expires_at < now();

    insert into public.loyalty_transactions (
      user_id, type, amount,
      balance_after_pending, balance_after_available,
      reason
    ) values (
      v_user_id, 'expire', -v_total,
      v_acc.balance_pending, v_acc.balance_available,
      'Expiration automatique (4 mois)'
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- =====================================================================
-- RPC 5 : loyalty_spend
-- =====================================================================
-- Appelée par le checkout (server action applyPoints).
-- Consomme FIFO sur les lignes earn_available.
create or replace function public.loyalty_spend(
  p_order_id uuid,
  p_user_id  uuid,
  p_amount   integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_acc        record;
  v_order      record;
  v_source     record;
  v_remaining  integer;
  v_take       integer;
  v_used       integer := 0;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'loyalty_spend: amount must be > 0';
  end if;

  -- Lock compte
  select * into v_acc
    from public.loyalty_accounts
   where user_id = p_user_id
   for update;

  if not found then
    raise exception 'loyalty_spend: account not found for user %', p_user_id;
  end if;

  -- Seuil d'utilisation
  if v_acc.balance_available < 1000 then
    raise exception 'loyalty_spend: threshold not reached (%, need 1000)', v_acc.balance_available;
  end if;

  -- Ne peut pas dépenser plus que la balance
  if p_amount > v_acc.balance_available then
    raise exception 'loyalty_spend: insufficient balance (% < %)', v_acc.balance_available, p_amount;
  end if;

  -- Lock commande
  select id, user_id, total_amount, loyalty_points_used, status
    into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'loyalty_spend: order % not found', p_order_id;
  end if;

  if v_order.user_id <> p_user_id then
    raise exception 'loyalty_spend: order does not belong to user';
  end if;

  if v_order.loyalty_points_used > 0 then
    raise exception 'loyalty_spend: order already has loyalty points applied';
  end if;

  if v_order.status not in ('pending', 'confirmed') then
    raise exception 'loyalty_spend: order status % does not allow spending', v_order.status;
  end if;

  -- Ne peut pas dépenser plus que le total de la commande
  if p_amount > v_order.total_amount then
    raise exception 'loyalty_spend: amount exceeds order total';
  end if;

  v_remaining := p_amount;

  -- Consommation FIFO (par expires_at asc)
  for v_source in
    select id, amount, expires_at, coalesce((metadata->>'remaining')::integer, amount) as remaining_source
      from public.loyalty_transactions
     where user_id = p_user_id
       and type = 'earn_available'
       and consumed_at is null
     order by expires_at asc nulls last, created_at asc
  loop
    exit when v_remaining <= 0;

    v_take := least(v_remaining, v_source.remaining_source);

    if v_take >= v_source.remaining_source then
      -- Ligne entièrement consommée
      update public.loyalty_transactions
         set consumed_at = now(),
             metadata = metadata || jsonb_build_object('remaining', 0)
       where id = v_source.id;
    else
      -- Consommation partielle : on garde la ligne ouverte, on décrémente le reste
      update public.loyalty_transactions
         set metadata = metadata || jsonb_build_object('remaining', v_source.remaining_source - v_take)
       where id = v_source.id;
    end if;

    v_remaining := v_remaining - v_take;
    v_used := v_used + v_take;
  end loop;

  if v_remaining > 0 then
    raise exception 'loyalty_spend: FIFO source lines insufficient (bug: balance mismatch)';
  end if;

  -- Update balances
  update public.loyalty_accounts
     set balance_available = balance_available - v_used,
         lifetime_spent = lifetime_spent + v_used,
         updated_at = now()
   where user_id = p_user_id
   returning * into v_acc;

  -- Audit
  insert into public.loyalty_transactions (
    user_id, order_id, type, amount,
    balance_after_pending, balance_after_available,
    reason
  ) values (
    p_user_id, p_order_id, 'spend', -v_used,
    v_acc.balance_pending, v_acc.balance_available,
    'Utilisation au checkout'
  );

  -- Update commande
  update public.orders
     set loyalty_points_used = v_used,
         total_amount = greatest(total_amount - v_used, 0)
   where id = p_order_id;

  return v_used;
end;
$$;

-- =====================================================================
-- RPC 6 : loyalty_admin_adjust
-- =====================================================================
-- Ajustement manuel par admin (+ ou -). Raison obligatoire.
create or replace function public.loyalty_admin_adjust(
  p_user_id uuid,
  p_amount  integer,  -- signé
  p_reason  text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_acc         record;
begin
  -- Vérif rôle admin
  select role into v_caller_role
    from public.profiles
   where id = auth.uid();

  if v_caller_role is distinct from 'admin' then
    raise exception 'loyalty_admin_adjust: admin role required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'loyalty_admin_adjust: reason is required';
  end if;

  if p_amount = 0 then
    raise exception 'loyalty_admin_adjust: amount cannot be zero';
  end if;

  -- Lock compte (crée si absent)
  insert into public.loyalty_accounts (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into v_acc
    from public.loyalty_accounts
   where user_id = p_user_id
   for update;

  -- Application sur balance_available (les ajustements ne passent pas par pending)
  if p_amount < 0 and v_acc.balance_available + p_amount < 0 then
    raise exception 'loyalty_admin_adjust: would make balance negative';
  end if;

  update public.loyalty_accounts
     set balance_available = balance_available + p_amount,
         lifetime_earned = lifetime_earned + greatest(p_amount, 0),
         lifetime_revoked = lifetime_revoked + greatest(-p_amount, 0),
         updated_at = now()
   where user_id = p_user_id
   returning * into v_acc;

  insert into public.loyalty_transactions (
    user_id, type, amount,
    balance_after_pending, balance_after_available,
    reason, created_by
  ) values (
    p_user_id, 'admin_adjust', p_amount,
    v_acc.balance_pending, v_acc.balance_available,
    p_reason, auth.uid()
  );
end;
$$;

-- =====================================================================
-- Permissions
-- =====================================================================
-- spend : appelable par authenticated (vérifs internes)
-- credit/promote/expire/revoke/adjust : appelables uniquement par service_role
grant execute on function public.loyalty_spend(uuid, uuid, integer) to authenticated;
grant execute on function public.loyalty_admin_adjust(uuid, integer, text) to authenticated;
revoke execute on function public.loyalty_credit_on_delivery(uuid) from public;
revoke execute on function public.loyalty_promote_pending_to_available() from public;
revoke execute on function public.loyalty_expire_points() from public;
revoke execute on function public.loyalty_revoke_on_return(uuid, text) from public;

-- =====================================================================
-- FIN supabase-loyalty-rpc.sql
-- =====================================================================
