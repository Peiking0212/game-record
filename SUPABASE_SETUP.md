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
| `20260529180000` | `steam_sync_and_email.sql` | `profiles.steam_id`, `user_games` playtime/last-played, `alert_events` email columns |
| `20260529181000` | `schedule_send_alert_emails.sql` | pg_cron `send_alert_emails` (retry safety-net) |

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
| `run-alert-evaluator` | off | Writes `channel='in_app'` events; chains `send-alert-emails` for new events |
| `send-alert-emails` | off | Sends Resend email for unsent `alert_events`; sets `emailed_at` |
| `lookup-game` | on | User JWT; Steam search → upsert `games` → optional `run-price-ingest` |
| `upsert-alert` | on | User JWT required |
| `sync-user-games` | on | Steam library auto-pull (body `steamId`) or manual `ownedGameIds`/`wishlistGameIds` |
| `fetch-personalized-feed` | on | Existing feed |

Hosted Edge Functions receive `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` automatically. If ingest returns `missing_service_env`, set secrets in Dashboard → Edge Functions → Secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Feature secrets (Dashboard → Edge Functions → Secrets):

| Variable | Required for | Source | Notes |
|----------|--------------|--------|-------|
| `STEAM_WEB_API_KEY` | `sync-user-games` (Steam auto-pull) | [Steam Web API key](https://steamcommunity.com/dev/apikey) | Without it, only manual `ownedGameIds`/`wishlistGameIds` mode works |
| `RESEND_API_KEY` | `send-alert-emails` | [Resend](https://resend.com/api-keys) | Without it, events stay unsent (function returns a `note`) |
| `ALERT_EMAIL_FROM` | `send-alert-emails` | Verified Resend domain | Defaults to `PeikingGameTime <onboarding@resend.dev>` (testing only) |
| `APP_URL` | `send-alert-emails` | — | Used for the "查看愿望单" link in emails |

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
| `send_alert_emails` | `15 */6 * * *` | `send-alert-emails` `{"limit":50}` (retry safety-net) |

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
- Events land in `alert_events` with `channel='in_app'`
- **Email**: `run-alert-evaluator` chains `send-alert-emails` for newly created events; the cron `send_alert_emails` retries any unsent ones. Email uses Resend (`RESEND_API_KEY`), recipient = the user's `auth.users.email`. Delivery is tracked per event via `alert_events.emailed_at` / `email_to` / `email_error`. Set `RESEND_API_KEY` (+ verified `ALERT_EMAIL_FROM`) to enable; without it events stay `emailed_at IS NULL` and are retried later.

Manual email run:

```bash
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/functions/v1/send-alert-emails" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit":50,"windowHours":72}'
```

## 8) Lookup game by user input (Steam search)

`POST /functions/v1/lookup-game` with user JWT:

```json
{ "query": "Collar×Malice", "import": true }
```

Or confirm by Steam AppID:

```json
{ "steamAppId": 591980, "import": true }
```

Flow: Steam `storesearch` → upsert `public.games` (service role) → best-effort `run-price-ingest` for that `gameId`.

Wishlist UI: on add (logged in) auto-calls lookup; unmatched cards show **从 Steam 搜索入库**.

Deploy: `supabase functions deploy lookup-game --no-verify-jwt` (gateway still validates JWT when enabled).

## 9) Frontend wishlist + in-app alerts + 看板娘

- `js/wishlist.js`: empty local wishlist + signed-in user → `games` + `game_best_prices` (lowest price + store)
- **目标价提醒**：登录后在愿望单卡片设置「目标价（CNY）」→ `POST /functions/v1/upsert-alert`（Bearer 用户 JWT），body `{ "gameId": 3, "targetPrice": 48, "enabled": true }`
- **站内提醒**：页顶「站内提醒」读取 `alert_events`（`channel='in_app'`）；「知道了」将事件 id 写入本地 `deal_watch_rules.dismissedAlertEventIds`（经 `site_data` 同步，无需 migration）
- **看板娘**：`js/mascot-notify.js` + `theme.js` 的 `window.MascotBridge`；有新未读提醒时气泡文案如「星露谷降到 48 元啦，低于你的目标价！」
- `js/lib/supabase-browser.js`: reads meta / `__APP_ENV__`
- Meta on `wishlist.html`, `index.html`, `game.html` (run `npm run supabase:inject-meta` after `.env` changes)

**手动测试**

1. 登录 → 打开 `wishlist.html`
2. 确保愿望单游戏名与 `games` 表一致（或条目带 `supabaseGameId`），填写目标价并保存
3. Dashboard 执行 `run-price-ingest` 后由 ingest 链式调用 `run-alert-evaluator`，或手动 `POST .../run-alert-evaluator`（service role）
4. 刷新愿望单：站内提醒列表 + 看板娘气泡；点击「知道了」清除未读红点

## 10) Smoke test

```bash
# Requires SUPABASE_SERVICE_ROLE_KEY in .env
npm run supabase:smoke
```

Checks: ingest invoke, `price_snapshots` count (expect multiple `store` values when ITAD key set), `game_best_prices` sample, alert evaluator, `alert_events` count.

## 11) sync-user-games (Steam library auto-pull)

**Steam mode** — pulls the user's owned library via `IPlayerService/GetOwnedGames`:

```bash
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/functions/v1/sync-user-games" \
  -H "Authorization: Bearer <USER_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"steamId":"7656119XXXXXXXXXX"}'
```

Flow: resolve SteamID64 (body `steamId`, else stored `profiles.steam_id`) → fetch owned games → upsert `public.games` (one row per `steam_app_id`, `cover_url` = Steam header image) → upsert `user_games` (`source='owned'`, `playtime_minutes`, `last_played_at`) → persist `profiles.steam_id` + `steam_synced_at`.

Requirements:
- Secret `STEAM_WEB_API_KEY` set (else `500 missing_steam_api_key`).
- Steam profile **and** game details set to **Public** (else `0` games returned).

**Manual mode** (back-compat) — explicit catalog ids:

```bash
curl ... -d '{"ownedGameIds":[3],"wishlistGameIds":[3]}'
```

**Frontend**: `games.html` shows a "同步 Steam 游戏库" card (logged-in users). `js/cloud-library.js` calls this function, then hydrates the owned library into the local `games` store.

## 12) 全站读 Supabase（关系表贯通）

`js/cloud-library.js` 在云端拉取流程中（`cloud-sync.js` 的 `pullFromCloud` 之后、`readyResolve` 之前）执行 `hydrate()`：

- 读取 `user_games`（`source='owned'`）join `games`（本用户，受 RLS 保护）
- 按 `steam_app_id` / 名称去重，合并进 localStorage `games`：补全封面、Steam 时长（`steamPlaytimeMinutes`）、`steamAppId`、`supabaseGameId`，新游戏以 `cloudSource:'steam'` 标记
- 各页 `whenGameCloudSynced(renderX)` 触发重渲染，故 `games` / `stats` / `index` / `spending` / `game` 详情页自动呈现 Steam 库与时长
- 已加载到全部 12 个页面（`<script src="js/cloud-library.js">`，在 `cloud-sync.js` 之后）

## 13) Next steps

1. Add Epic / other store adapters
2. ~~Wire `in_app` alert events to UI~~ (wishlist 页已实现；可扩展到全局顶栏)
3. ~~Email provider for `alert_events`~~ (Resend via `send-alert-emails`；需配置 `RESEND_API_KEY`)
4. ~~Steam library sync~~ (`sync-user-games` Steam 模式；需配置 `STEAM_WEB_API_KEY`)
5. (可选) 把 `supabase_service_role_key` 写入 Vault，便于将来对 cron 目标函数开启 `verify_jwt`
6. Periodic Steam re-sync via cron (reuse stored `profiles.steam_id`)
7. Integration tests for RLS + function flows
