-- Schedule Edge Functions via pg_cron + pg_net (Supabase hosted).
-- One-time Vault setup (Dashboard SQL or local): store service role for cron auth.
--   select vault.create_secret('<YOUR_SERVICE_ROLE_KEY>', 'supabase_service_role_key', 'Cron auth for Edge Functions');
-- Replace project URL below if you use a different Supabase project ref.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Price ingest: every 6 hours
select cron.unschedule(jobid)
from cron.job
where jobname = 'run_price_ingest_all';

select cron.schedule(
  'run_price_ingest_all',
  '0 */6 * * *',
  $$
  select net.http_post(
    url := 'https://oxbyshstrvzshxpaztzg.supabase.co/functions/v1/run-price-ingest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_service_role_key' limit 1),
        ''
      )
    ),
    body := '{"all": true}'::jsonb
  ) as request_id;
  $$
);

-- Alert evaluator backup: every 12 hours (ingest also chains evaluator)
select cron.unschedule(jobid)
from cron.job
where jobname = 'run_alert_evaluator';

select cron.schedule(
  'run_alert_evaluator',
  '0 */12 * * *',
  $$
  select net.http_post(
    url := 'https://oxbyshstrvzshxpaztzg.supabase.co/functions/v1/run-alert-evaluator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_service_role_key' limit 1),
        ''
      )
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
