-- =====================================================================
-- MAYOMBE MARKET — PROGRAMME FIDÉLITÉ (Cron jobs)
-- =====================================================================
-- Fichier : supabase-loyalty-cron.sql
-- Rôle    : activation pg_cron + planification des jobs quotidiens
-- Dépend  : supabase-loyalty-schema.sql + supabase-loyalty-rpc.sql
--
-- À exécuter APRÈS les deux autres fichiers.
-- À exécuter UNE SEULE FOIS (les jobs persistent).
--
-- Pour désactiver temporairement un job :
--   select cron.unschedule('loyalty_promote');
-- Pour lister les jobs :
--   select * from cron.job;
-- Pour voir l'historique d'exécution :
--   select * from cron.job_run_details order by start_time desc limit 20;
-- =====================================================================

-- Activer pg_cron (Supabase : disponible sur tous les plans depuis 2023)
create extension if not exists pg_cron with schema extensions;

-- Donner au rôle postgres le droit d'utiliser cron
grant usage on schema cron to postgres;

-- ---------------------------------------------------------------------
-- Job 1 : promotion pending → available (tous les jours à 02h00 UTC)
-- ---------------------------------------------------------------------
-- Supprime l'existant s'il existe (idempotence du script)
do $$
begin
  perform cron.unschedule('loyalty_promote');
exception when others then
  null;
end$$;

select cron.schedule(
  'loyalty_promote',
  '0 2 * * *',
  $$select public.loyalty_promote_pending_to_available();$$
);

-- ---------------------------------------------------------------------
-- Job 2 : expiration des points (tous les jours à 02h30 UTC)
-- ---------------------------------------------------------------------
do $$
begin
  perform cron.unschedule('loyalty_expire');
exception when others then
  null;
end$$;

select cron.schedule(
  'loyalty_expire',
  '30 2 * * *',
  $$select public.loyalty_expire_points();$$
);

-- =====================================================================
-- FIN supabase-loyalty-cron.sql
-- =====================================================================
