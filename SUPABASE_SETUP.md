# Supabase MVP Setup

## 1) Configure env

1. Copy `.env.example` to `.env` (never commit `.env`).
2. Fill at least:
   - `NEXT_PUBLIC_SUPABASE_URL` — e.g. `https://oxbyshstrvzshxpaztzg.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Dashboard → Settings → API → anon (legacy JWT)
   - `SUPABASE_SERVICE_ROLE_KEY` — server/Edge/smoke only, **never** in HTML or frontend
   - `APP_ENV`, `APP_URL`
3. Inject browser keys into static HTML (optional, local):

```bash
npm run supabase:inject-meta
```

Targets `wishlist.html`, `index.html`, `game.html` meta tags. Or set `window.__APP_ENV__` before `supabase-browser.js`.

## 2) Run migration and seed

Remote project (via MCP / Dashboard) applied migrations:

| Version | File | Purpose |
|---------|------|---------|
| `20260528120000` | `mvp_base.sql` | Core schema, user-owned RLS |
| `20260528130000` | `harden_games_rls.sql` | Catalog / pricing / ingest RLS |
| `20260529140000` | `schedule_edge_cron.sql` | pg_cron → Edge Functions |
| `20260529160000` | `price_snapshots_meta_itad_views.sql` | `meta` column, per-store latest + `game_best_prices` |

Seed catalog (includes a **paid** Steam title for price ingest tests):

```bash
# Dashboard SQL Editor, or supabase db seed when CLI linked
# File: supabase/seed.sql
```

## 3) Deploy Edge Functions

Deployed on project `oxbyshstrvzshxpaztzg`:

| Function | JWT verify | Notes |
|----------|------------|--------|
| `run-price-ingest` | off | v3+ ITAD-primary; chains `run-alert-evaluator` after success |
| `run-alert-evaluator` | off | `channel='in_app'` placeholder |
| `upsert-alert` | on | User JWT required |
| `sync-user-games` | on | Body: `ownedGameIds`, `wishlistGameIds` |
| `fetch-personalized-feed` | on | Existing feed |

Hosted Edge Functions receive `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` automatically. If ingest returns `missing_service_env`, set secrets in Dashboard → Edge Functions → Secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Price ingest secrets (Edge Functions → Secrets; see `.env.example`):

| Variable | Required | Source | Notes |
|----------|----------|--------|--------|
| `STEAM_STORE_CC` | no | — | Steam `appdetails` region (default `cn`) |
| `STEAM_STORE_LANG` | no | — | Steam language (default `schinese`) |
| `ITAD_API_KEY` | **yes (prod)** | [ITAD Dev](https://isthereanydeal.com/dev/) | Primary multi-store prices; omit = warn + Steam/CheapShark fallback |
| `ITAD_COUNTRY` | no | — | ISO country for ITAD (`CN`, `US`, …) |
| `ITAD_REQUEST_DELAY_MS` | no | — | Pause between ITAD requests (default `400`) |

CheapShark and Steam `appdetails` need no key (fallback only). SteamDB is not implemented.

**ITAD rate limits:** No fixed per-minute quota in docs; abusive traffic may be blocked. Use `ITAD_REQUEST_DELAY_MS` (default 400ms), batch via cron (`0 */6 * * *`), avoid hammering lookup/prices in tight loops. See [API docs](https://docs.isthereanydeal.com/).

**Steam:** No published key limit; may throttle aggressive IPs.

Redeploy after code changes:

```bash
# Regenerate deploy payload (6 files under adapters/)
node scripts/deploy-price-ingest-mcp.mjs

# Then deploy via Supabase MCP deploy_edge_function using .deploy-run-price-ingest.json
# Or: supabase login && npx supabase functions deploy run-price-ingest --project-ref oxbyshstrvzshxpaztzg --no-verify-jwt
```

## 4) Security (RLS)

See previous table in repo history. Summary:

- `games`, `price_snapshots`: authenticated SELECT; writes via service role only
- `ingest_jobs`: no anon/authenticated access
- `game_latest_prices`, `game_best_prices`: `security_invoker` views

Never commit `.env` or service role keys.

## 5) Price ingest (`run-price-ingest` v3+)

Adapters under `supabase/functions/run-price-ingest/adapters/`:

| `price_snapshots.store` | Source | Key | Role |
|-------------------------|--------|-----|------|
| `steam`, `gog`, `epic`, … | [IsThereAnyDeal](https://api.isthereanydeal.com/) `/games/prices/v3` | `ITAD_API_KEY` | **Primary** — one row per shop |
| `steam` | Steam `appdetails` | none | Fallback if ITAD missing/fails |
| `steam` / `cheapshark` | [CheapShark](https://www.cheapshark.com/api) | none | Fallback if ITAD + Steam have no price |

Flow: lookup by `steam_app_id` → ITAD prices (all shops in region) → write snapshots with `meta` (`historical_low`, `store_low`, `itad_game_id`, …). If ITAD unavailable, Steam then CheapShark.

Views:

- `game_latest_prices` — latest price **per game per store**
- `game_best_prices` — **lowest** current price per game (`best_store` column); used by alerts + wishlist

Paid titles (e.g. Stardew Valley `413150`) should produce multiple store rows when ITAD key is set. F2P titles may only get fallback data.

Manual invoke:

```bash
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/functions/v1/run-price-ingest" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"all": true}'
```

## 6) Cron (pg_cron + pg_net)

Migration `schedule_edge_cron.sql` registers:

| Job | Schedule | Target |
|-----|----------|--------|
| `run_price_ingest_all` | `0 */6 * * *` | `run-price-ingest` `{"all":true}` |
| `run_alert_evaluator` | `0 */12 * * *` | `run-alert-evaluator` |

**One-time Vault setup** (Dashboard SQL Editor) so cron can authenticate:

```sql
select vault.create_secret(
  '<YOUR_SERVICE_ROLE_KEY>',
  'supabase_service_role_key',
  'Cron auth for Edge Functions'
);
```

Without this secret, cron HTTP calls send `Bearer` with an empty token.

Verify jobs:

```sql
select jobid, jobname, schedule from cron.job;
```

## 7) Alerts

- Create/update: `POST /functions/v1/upsert-alert` with user JWT, body `{ "gameId": 3, "targetPrice": 99 }`
- Evaluate: `POST /functions/v1/run-alert-evaluator` (service role or cron)
- Events land in `alert_events` with `channel='in_app'` — email/webhook later

## 8) Frontend wishlist

- `js/wishlist.js`: empty local wishlist + signed-in user → `games` + `game_best_prices` (lowest price + store)
- `js/lib/supabase-browser.js`: reads meta / `__APP_ENV__`
- Meta on `wishlist.html`, `index.html`, `game.html` (run `npm run supabase:inject-meta` after `.env` changes)

## 9) Smoke test

```bash
# Requires SUPABASE_SERVICE_ROLE_KEY in .env
npm run supabase:smoke
```

Checks: ingest invoke, `price_snapshots` count (expect multiple `store` values when ITAD key set), `game_best_prices` sample, alert evaluator, `alert_events` count.

## 10) sync-user-games (skeleton)

```bash
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/functions/v1/sync-user-games" \
  -H "Authorization: Bearer <USER_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"ownedGameIds":[3],"wishlistGameIds":[3]}'
```

Upserts `user_games` rows (`owned` / `wishlist`). Steam API sync is future work.

## 11) Next steps

1. Add Epic / other store adapters
2. Wire `in_app` alert events to UI toast center
3. Email provider for `alert_events.channel`
4. Integration tests for RLS + function flows
