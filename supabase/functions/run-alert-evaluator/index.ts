import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const DEDUPE_HOURS = 24;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { ok: false, error: "missing_service_env" });
    }

    const payload = await req.json().catch(() => ({}));
    const filterGameId = Number(payload?.gameId);
    const onlyGameId = Number.isFinite(filterGameId) && filterGameId > 0 ? filterGameId : null;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    let alertsQuery = admin
      .from("alerts")
      .select("id, game_id, target_price, user_id")
      .eq("enabled", true)
      .limit(100);

    if (onlyGameId) {
      alertsQuery = alertsQuery.eq("game_id", onlyGameId);
    }

    const { data: alerts, error: alertsError } = await alertsQuery;

    if (alertsError) {
      return json(500, { ok: false, error: "fetch_alerts_failed", detail: alertsError.message });
    }

    const since = new Date(Date.now() - DEDUPE_HOURS * 60 * 60 * 1000).toISOString();
    const createdEvents: number[] = [];
    const skipped: string[] = [];

    for (const alert of alerts || []) {
      const { data: latestPrice } = await admin
        .from("game_best_prices")
        .select("price, best_store")
        .eq("game_id", alert.game_id)
        .maybeSingle();

      const currentPrice = Number(latestPrice?.price);
      const targetPrice = Number(alert.target_price);

      if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
        skipped.push(`alert_${alert.id}:no_price`);
        continue;
      }
      if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
        skipped.push(`alert_${alert.id}:bad_target`);
        continue;
      }
      if (currentPrice > targetPrice) {
        skipped.push(`alert_${alert.id}:above_target`);
        continue;
      }

      const { data: recent } = await admin
        .from("alert_events")
        .select("id")
        .eq("alert_id", alert.id)
        .gte("triggered_at", since)
        .limit(1);

      if (recent && recent.length > 0) {
        skipped.push(`alert_${alert.id}:deduped`);
        continue;
      }

      const { data: event, error: eventError } = await admin
        .from("alert_events")
        .insert({
          alert_id: alert.id,
          trigger_price: currentPrice,
          channel: "in_app",
          status: "triggered",
        })
        .select("id")
        .single();

      if (!eventError && event?.id) {
        createdEvents.push(event.id as number);
      } else if (eventError) {
        skipped.push(`alert_${alert.id}:insert_${eventError.message}`);
      }
    }

    // Chain email delivery for freshly created events (best-effort, non-blocking).
    if (createdEvents.length > 0) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-alert-emails`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ limit: 50 }),
        });
      } catch (_e) {
        /* email delivery is non-fatal for evaluation */
      }
    }

    return json(200, {
      ok: true,
      scannedAlerts: (alerts || []).length,
      triggeredEvents: createdEvents.length,
      eventIds: createdEvents,
      skipped,
      gameIdFilter: onlyGameId,
    });
  } catch (error) {
    return json(500, { ok: false, error: "unexpected_error", detail: String(error) });
  }
});
