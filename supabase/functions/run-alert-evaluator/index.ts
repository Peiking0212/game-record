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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { ok: false, error: "missing_service_env" });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: alerts, error: alertsError } = await admin
      .from("alerts")
      .select("id, game_id, target_price")
      .eq("enabled", true)
      .limit(100);

    if (alertsError) {
      return json(500, { ok: false, error: "fetch_alerts_failed", detail: alertsError.message });
    }

    const createdEvents: number[] = [];
    for (const alert of alerts || []) {
      const { data: latestPrice } = await admin
        .from("game_best_prices")
        .select("price, best_store")
        .eq("game_id", alert.game_id)
        .maybeSingle();

      const currentPrice = Number(latestPrice?.price);
      if (Number.isFinite(currentPrice) && currentPrice <= Number(alert.target_price)) {
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
        }
      }
    }

    return json(200, {
      ok: true,
      scannedAlerts: (alerts || []).length,
      triggeredEvents: createdEvents.length,
      eventIds: createdEvents,
    });
  } catch (error) {
    return json(500, { ok: false, error: "unexpected_error", detail: String(error) });
  }
});
