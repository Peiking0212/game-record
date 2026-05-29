-- Retry safety-net for email delivery. run-alert-evaluator already chains
-- send-alert-emails after creating events; this cron re-attempts any events
-- left unsent (e.g. RESEND_API_KEY added after events were created).

select cron.unschedule(jobid)
from cron.job
where jobname = 'send_alert_emails';

select cron.schedule(
  'send_alert_emails',
  '15 */6 * * *',
  $$
  select net.http_post(
    url := 'https://oxbyshstrvzshxpaztzg.supabase.co/functions/v1/send-alert-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_service_role_key' limit 1),
        ''
      )
    ),
    body := '{"limit": 50}'::jsonb
  ) as request_id;
  $$
);
