-- Harden RLS for catalog, pricing, and ingest tables.
-- Service role (Edge Functions) bypasses RLS; anon/authenticated follow policies below.

alter table public.games enable row level security;
alter table public.price_snapshots enable row level security;
alter table public.ingest_jobs enable row level security;

-- games: authenticated read-only catalog
drop policy if exists games_select_authenticated on public.games;
create policy games_select_authenticated
  on public.games
  for select
  to authenticated
  using (true);

-- price_snapshots: authenticated read-only; writes only via service role
drop policy if exists price_snapshots_select_authenticated on public.price_snapshots;
create policy price_snapshots_select_authenticated
  on public.price_snapshots
  for select
  to authenticated
  using (true);

-- ingest_jobs: no policies for anon/authenticated (deny all API access)

-- View must run as invoker so underlying RLS applies (Postgres 15+)
create or replace view public.game_latest_prices
with (security_invoker = true)
as
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
