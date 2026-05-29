import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getAdapterRegistry,
  listAdapterStores,
  normalizeQuotes,
  type AdapterAttempt,
  type AdapterRegistry,
  type PriceAdapter,
  type PriceQuote,
} from "./adapters/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function ensureAdapterBucket(
  summary: Record<string, { ok: number; fail: number; skip: number; written: number }>,
  store: string,
) {
  if (!summary[store]) {
    summary[store] = { ok: 0, fail: 0, skip: 0, written: 0 };
  }
  return summary[store];
}

async function runAdapter(
  adapter: PriceAdapter,
  steamAppId: number | null,
  gameTitle: string | null,
): Promise<AdapterAttempt> {
  if (!steamAppId || steamAppId <= 0) {
    return {
      store: adapter.store,
      ok: false,
      skipped: true,
      skipReason: "missing_steam_app_id",
    };
  }

  try {
    const result = await adapter.fetchBySteamAppId(steamAppId, gameTitle);
    const quotes = normalizeQuotes(result);
    return {
      store: adapter.store,
      ok: true,
      quotes,
      quote: quotes[0] ?? null,
    };
  } catch (error) {
    return {
      store: adapter.store,
      ok: false,
      error: String(error),
      quote: null,
      quotes: [],
    };
  }
}

async function collectQuotesForGame(
  registry: AdapterRegistry,
  steamAppId: number | null,
  gameTitle: string | null,
  region: string,
): Promise<{
  quotes: PriceQuote[];
  adapters: AdapterAttempt[];
  mode: "itad" | "fallback";
}> {
  const adapters: AdapterAttempt[] = [];
  const quotes: PriceQuote[] = [];

  if (registry.itad) {
    const itadAttempt = await runAdapter(registry.itad, steamAppId, gameTitle);
    adapters.push(itadAttempt);

    if (itadAttempt.quotes?.length) {
      quotes.push(...itadAttempt.quotes);
      for (const q of quotes) {
        if (!q.region) q.region = region;
      }
      return { quotes, adapters, mode: "itad" };
    }

    if (!itadAttempt.skipped && !itadAttempt.ok) {
      console.warn("[price-ingest] ITAD failed, falling back to Steam/CheapShark", {
        error: itadAttempt.error,
        steamAppId,
      });
    }
  } else {
    adapters.push({
      store: "itad",
      ok: true,
      skipped: true,
      skipReason: "ITAD_API_KEY not configured",
    });
    console.warn("[price-ingest] ITAD_API_KEY missing — using Steam/CheapShark fallback only");
  }

  const steamAttempt = await runAdapter(registry.steam, steamAppId, gameTitle);
  adapters.push(steamAttempt);
  if (steamAttempt.quotes?.length) {
    quotes.push(...steamAttempt.quotes);
  }

  if (!quotes.length) {
    const csAttempt = await runAdapter(registry.cheapshark, steamAppId, gameTitle);
    adapters.push(csAttempt);
    if (csAttempt.quotes?.length) {
      quotes.push(...csAttempt.quotes);
    }
  } else {
    adapters.push({
      store: registry.cheapshark.store,
      ok: true,
      skipped: true,
      skipReason: "fallback_not_needed",
    });
  }

  for (const q of quotes) {
    if (!q.region) q.region = region;
  }

  return { quotes, adapters, mode: "fallback" };
}

function recordAdapterSummary(
  adapterSummary: Record<string, { ok: number; fail: number; skip: number; written: number }>,
  attempt: AdapterAttempt,
) {
  if (attempt.quotes?.length) {
    for (const q of attempt.quotes) {
      const bucket = ensureAdapterBucket(adapterSummary, q.store);
      if (attempt.skipped) bucket.skip += 1;
      else if (attempt.ok) bucket.ok += 1;
      else bucket.fail += 1;
    }
    return;
  }

  const bucket = ensureAdapterBucket(adapterSummary, attempt.store);
  if (attempt.skipped) bucket.skip += 1;
  else if (attempt.ok) bucket.ok += 1;
  else bucket.fail += 1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { ok: false, error: "missing_service_env" });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  let jobId: number | null = null;
  const now = new Date().toISOString();
  const registry = getAdapterRegistry();

  try {
    const payload = await req.json().catch(() => ({}));
    const gameId = Number(payload?.gameId || 0);
    const region = String(payload?.region || "CN");
    const ingestAll = payload?.all === true;

    const { data: job, error: jobError } = await admin
      .from("ingest_jobs")
      .insert({
        job_type: "price_ingest",
        status: "running",
        started_at: now,
        meta: {
          requestedGameId: gameId || null,
          ingestAll,
          adapters: listAdapterStores(registry),
          itadConfigured: Boolean(registry.itad),
          primarySource: registry.itad ? "itad" : "fallback",
          version: 3,
        },
      })
      .select("id")
      .single();

    if (jobError || !job?.id) {
      return json(500, { ok: false, error: "job_create_failed", detail: jobError?.message });
    }

    jobId = job.id as number;

    let gameQuery = admin.from("games").select("id, steam_app_id, name");
    if (!ingestAll && gameId > 0) {
      gameQuery = gameQuery.eq("id", gameId);
    } else if (!ingestAll) {
      gameQuery = gameQuery.limit(0);
    }

    const { data: games, error: gamesError } = await gameQuery;
    if (gamesError) throw new Error(gamesError.message);

    const results: Array<Record<string, unknown>> = [];
    const adapterSummary: Record<string, { ok: number; fail: number; skip: number; written: number }> =
      {};

    for (const store of listAdapterStores(registry)) {
      ensureAdapterBucket(adapterSummary, store);
    }

    let itadGames = 0;
    let fallbackGames = 0;

    for (const game of games || []) {
      const steamAppId = game.steam_app_id ? Number(game.steam_app_id) : null;
      const { quotes, adapters, mode } = await collectQuotesForGame(
        registry,
        steamAppId,
        game.name ?? null,
        region,
      );

      if (mode === "itad") itadGames += 1;
      else fallbackGames += 1;

      for (const attempt of adapters) {
        recordAdapterSummary(adapterSummary, attempt);
      }

      if (!quotes.length) {
        results.push({
          gameId: game.id,
          name: game.name,
          status: "skipped",
          reason: steamAppId ? "no_quote" : "missing_steam_app_id",
          mode,
          adapters,
        });
        continue;
      }

      const writtenStores: string[] = [];
      const writeErrors: string[] = [];

      for (const quote of quotes) {
        const { error: snapshotError } = await admin.from("price_snapshots").insert({
          game_id: game.id,
          store: quote.store,
          region: quote.region || region,
          currency: quote.currency,
          price: quote.price,
          original_price: quote.originalPrice,
          discount_pct: quote.discountPct,
          meta: quote.meta ?? {},
        });

        if (snapshotError) {
          writeErrors.push(`${quote.store}: ${snapshotError.message}`);
          continue;
        }

        writtenStores.push(quote.store);
        ensureAdapterBucket(adapterSummary, quote.store).written += 1;
      }

      results.push({
        gameId: game.id,
        name: game.name,
        status: writeErrors.length === quotes.length ? "error" : "written",
        mode,
        stores: writtenStores,
        adapters: adapters.map((a) => ({
          store: a.store,
          ok: a.ok,
          skipped: a.skipped,
          skipReason: a.skipReason,
          error: a.error,
          quoteCount: a.quotes?.length ?? (a.quote ? 1 : 0),
        })),
        prices: quotes.map((q) => ({
          store: q.store,
          price: q.price,
          currency: q.currency,
        })),
        errors: writeErrors.length ? writeErrors : undefined,
      });
    }

    await admin
      .from("ingest_jobs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        meta: {
          requestedGameId: gameId || null,
          ingestAll,
          adapters: listAdapterStores(registry),
          itadConfigured: Boolean(registry.itad),
          primarySource: registry.itad ? "itad" : "fallback",
          itadGames,
          fallbackGames,
          version: 3,
          adapterSummary,
          results,
        },
      })
      .eq("id", jobId);

    try {
      await fetch(`${supabaseUrl}/functions/v1/run-alert-evaluator`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      });
    } catch {
      // best-effort alert evaluation after ingest
    }

    return json(200, {
      ok: true,
      jobId,
      processed: results.length,
      primarySource: registry.itad ? "itad" : "fallback",
      itadGames,
      fallbackGames,
      adapterSummary,
      results,
    });
  } catch (error) {
    if (jobId) {
      await admin
        .from("ingest_jobs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error: String(error),
        })
        .eq("id", jobId);
    }
    return json(500, { ok: false, error: "ingest_failed", detail: String(error), jobId });
  }
});
