-- Per-alert email opt-in for target-price notifications (Resend via send-alert-emails).
alter table public.alerts
  add column if not exists notify_email boolean not null default true;

comment on column public.alerts.notify_email is
  'When false, send-alert-emails skips this alert''s events.';
