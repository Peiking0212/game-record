#!/usr/bin/env node
/**
 * MVP smoke: invoke run-price-ingest, optional alert seed + evaluator check.
 * Requires .env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

function loadEnv() {
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnv(), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "";
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const admin = createClient(url, serviceKey);

async function main() {
  console.log("1) Invoke run-price-ingest { all: true }");
  const ingestRes = await fetch(`${url}/functions/v1/run-price-ingest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ all: true }),
  });
  const ingestBody = await ingestRes.json().catch(() => ({}));
  console.log("   status", ingestRes.status, ingestBody.ok ? "ok" : ingestBody);

  const { count: snapCount } = await admin
    .from("price_snapshots")
    .select("*", { count: "exact", head: true });
  console.log("2) price_snapshots count:", snapCount);

  const { data: latest } = await admin.from("game_latest_prices").select("game_id, store, price").limit(8);
  console.log("3) game_latest_prices sample:", latest?.length ?? 0, "rows", latest);

  const { data: best } = await admin.from("game_best_prices").select("game_id, best_store, price, currency").limit(3);
  console.log("4) game_best_prices sample:", best?.length ?? 0, "rows", best);

  const stores = [...new Set((latest || []).map((r) => r.store))];
  console.log("   distinct stores in latest:", stores.join(", ") || "(none)");

  console.log("5) Invoke run-alert-evaluator");
  const evalRes = await fetch(`${url}/functions/v1/run-alert-evaluator`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const evalBody = await evalRes.json().catch(() => ({}));
  console.log("   status", evalRes.status, evalBody);

  const { count: eventCount } = await admin
    .from("alert_events")
    .select("*", { count: "exact", head: true });
  console.log("6) alert_events count:", eventCount);

  console.log("Smoke done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
