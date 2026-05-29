-- Supabase MVP base schema
-- NOTE: This migration intentionally uses IF NOT EXISTS guards to avoid breaking
-- existing environments while introducing a standard baseline.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  region text,
  currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.games (
  id bigserial primary key,
  steam_app_id bigint unique,
  name text not null,
  genres text[] default '{}'::text[],
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_games (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id bigint not null references public.games (id) on delete cascade,
  source text not null check (source in ('owned', 'wishlist')),
  added_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game_id, source)
);

create table if not exists public.price_snapshots (
  id bigserial primary key,
  game_id bigint not null references public.games (id) on delete cascade,
  store text not null,
  region text not null,
  currency text not null,
  price numeric(10, 2) not null,
  original_price numeric(10, 2),
  discount_pct int,
  captured_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id bigint not null references public.games (id) on delete cascade,
  target_price numeric(10, 2) not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game_id)
);

create table if not exists public.alert_events (
  id bigserial primary key,
  alert_id bigint not null references public.alerts (id) on delete cascade,
  trigger_price numeric(10, 2) not null,
  channel text,
  status text,
  triggered_at timestamptz not null default now()
);

create table if not exists public.ingest_jobs (
  id bigserial primary key,
  job_type text not null,
  status text not null,
  started_at timestamptz,
  finished_at timestamptz,
  next_run_at timestamptz,
  error text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_price_snapshots_game_captured
  on public.price_snapshots (game_id, captured_at desc);

create index if not exists idx_alerts_user_enabled
  on public.alerts (user_id, enabled);

create index if not exists idx_alert_events_alert_triggered
  on public.alert_events (alert_id, triggered_at desc);

create index if not exists idx_ingest_jobs_status_next_run
  on public.ingest_jobs (status, next_run_at);

-- RLS setup for user-owned data tables
alter table public.profiles enable row level security;
alter table public.user_games enable row level security;
alter table public.alerts enable row level security;
alter table public.alert_events enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own
  on public.profiles for delete
  using (auth.uid() = id);

drop policy if exists user_games_select_own on public.user_games;
create policy user_games_select_own
  on public.user_games for select
  using (auth.uid() = user_id);

drop policy if exists user_games_insert_own on public.user_games;
create policy user_games_insert_own
  on public.user_games for insert
  with check (auth.uid() = user_id);

drop policy if exists user_games_update_own on public.user_games;
create policy user_games_update_own
  on public.user_games for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists user_games_delete_own on public.user_games;
create policy user_games_delete_own
  on public.user_games for delete
  using (auth.uid() = user_id);

drop policy if exists alerts_select_own on public.alerts;
create policy alerts_select_own
  on public.alerts for select
  using (auth.uid() = user_id);

drop policy if exists alerts_insert_own on public.alerts;
create policy alerts_insert_own
  on public.alerts for insert
  with check (auth.uid() = user_id);

drop policy if exists alerts_update_own on public.alerts;
create policy alerts_update_own
  on public.alerts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists alerts_delete_own on public.alerts;
create policy alerts_delete_own
  on public.alerts for delete
  using (auth.uid() = user_id);

drop policy if exists alert_events_select_own on public.alert_events;
create policy alert_events_select_own
  on public.alert_events for select
  using (
    exists (
      select 1
      from public.alerts a
      where a.id = alert_events.alert_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists alert_events_insert_own on public.alert_events;
create policy alert_events_insert_own
  on public.alert_events for insert
  with check (
    exists (
      select 1
      from public.alerts a
      where a.id = alert_events.alert_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists alert_events_update_own on public.alert_events;
create policy alert_events_update_own
  on public.alert_events for update
  using (
    exists (
      select 1
      from public.alerts a
      where a.id = alert_events.alert_id
        and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.alerts a
      where a.id = alert_events.alert_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists alert_events_delete_own on public.alert_events;
create policy alert_events_delete_own
  on public.alert_events for delete
  using (
    exists (
      select 1
      from public.alerts a
      where a.id = alert_events.alert_id
        and a.user_id = auth.uid()
    )
  );

-- Public read model:
-- - users can read games
-- - users read latest prices from a curated view
-- - direct access to raw snapshots is not granted
grant select on public.games to anon, authenticated;
revoke all on public.price_snapshots from anon, authenticated;
revoke all on public.ingest_jobs from anon, authenticated;

create or replace view public.game_latest_prices as
select distinct on (ps.game_id)
  ps.game_id,
  ps.store,
  ps.region,
  ps.currency,
  ps.price,
  ps.original_price,
  ps.discount_pct,
  ps.captured_at
from public.price_snapshots ps
order by ps.game_id, ps.captured_at desc;

grant select on public.game_latest_prices to anon, authenticated;
