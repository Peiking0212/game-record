-- ITAD multi-store snapshots: optional meta per row; views for per-store latest + cross-store best.

alter table public.price_snapshots
  add column if not exists meta jsonb not null default '{}'::jsonb;

comment on column public.price_snapshots.meta is
  'Provider extras: historical_low, store_low, itad_game_id, deal_url, etc.';

-- Latest snapshot per game per store (Steam, GOG, Epic, …)
create or replace view public.game_latest_prices
with (security_invoker = true)
as
select distinct on (ps.game_id, ps.store)
  ps.game_id,
  ps.store,
  ps.region,
  ps.currency,
  ps.price,
  ps.original_price,
  ps.discount_pct,
  ps.captured_at,
  ps.meta
from public.price_snapshots ps
order by ps.game_id, ps.store, ps.captured_at desc;

-- Cheapest current price per game across all stores (for alerts + wishlist headline)
create or replace view public.game_best_prices
with (security_invoker = true)
as
with latest_per_store as (
  select distinct on (ps.game_id, ps.store)
    ps.game_id,
    ps.store,
    ps.region,
    ps.currency,
    ps.price,
    ps.original_price,
    ps.discount_pct,
    ps.captured_at,
    ps.meta
  from public.price_snapshots ps
  order by ps.game_id, ps.store, ps.captured_at desc
)
select distinct on (lps.game_id)
  lps.game_id,
  lps.store as best_store,
  lps.region,
  lps.currency,
  lps.price,
  lps.original_price,
  lps.discount_pct,
  lps.captured_at,
  lps.meta
from latest_per_store lps
order by lps.game_id, lps.price asc, lps.captured_at desc;

grant select on public.game_best_prices to anon, authenticated;
