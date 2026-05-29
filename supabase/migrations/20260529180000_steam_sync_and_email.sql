-- Steam library sync + email notification support.
-- Idempotent guards so re-running on existing environments is safe.

-- 1) Per-user Steam identity for sync-user-games (GetOwnedGames).
alter table public.profiles
  add column if not exists steam_id text,
  add column if not exists steam_synced_at timestamptz;

comment on column public.profiles.steam_id is
  'SteamID64 used by sync-user-games to pull the owned library. Profile must be public on Steam.';

-- 2) Owned-library metadata so synced games surface playtime/last-played across the site.
alter table public.user_games
  add column if not exists playtime_minutes integer,
  add column if not exists last_played_at timestamptz;

-- 3) Email delivery bookkeeping for alert_events (Resend).
alter table public.alert_events
  add column if not exists emailed_at timestamptz,
  add column if not exists email_to text,
  add column if not exists email_error text;

create index if not exists idx_alert_events_email_pending
  on public.alert_events (emailed_at)
  where emailed_at is null;
