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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const authHeader = req.headers.get("Authorization") || "";

    if (!supabaseUrl || !supabaseAnonKey || !authHeader) {
      return json(500, { ok: false, error: "missing_function_env_or_auth" });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return json(401, { ok: false, error: "unauthorized" });
    }

    const payload = await req.json().catch(() => ({}));
    const gameId = Number(payload?.gameId);
    const targetPrice = Number(payload?.targetPrice);
    const enabled = payload?.enabled !== false;
    const notifyEmail = payload?.notifyEmail !== false;

    if (!Number.isFinite(gameId) || gameId <= 0 || !Number.isFinite(targetPrice) || targetPrice <= 0) {
      return json(400, { ok: false, error: "invalid_payload", required: ["gameId", "targetPrice"] });
    }

    const { data, error } = await userClient
      .from("alerts")
      .upsert(
        {
          user_id: authData.user.id,
          game_id: gameId,
          target_price: targetPrice,
          enabled,
          notify_email: notifyEmail,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,game_id" },
      )
      .select("*")
      .single();

    if (error) {
      return json(500, { ok: false, error: "upsert_failed", detail: error.message });
    }

    let evaluation: Record<string, unknown> | null = null;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (serviceRoleKey) {
      const admin = createClient(supabaseUrl, serviceRoleKey);
      const { data: latestPrice } = await admin
        .from("game_best_prices")
        .select("price, best_store")
        .eq("game_id", gameId)
        .maybeSingle();

      const currentPrice = Number(latestPrice?.price);
      const target = Number(targetPrice);
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      if (
        Number.isFinite(currentPrice) &&
        currentPrice > 0 &&
        Number.isFinite(target) &&
        currentPrice <= target
      ) {
        const { data: recent } = await admin
          .from("alert_events")
          .select("id")
          .eq("alert_id", data.id)
          .gte("triggered_at", since)
          .limit(1);

        if (!recent || recent.length === 0) {
          const { data: event, error: evErr } = await admin
            .from("alert_events")
            .insert({
              alert_id: data.id,
              trigger_price: currentPrice,
              channel: "in_app",
              status: "triggered",
            })
            .select("id")
            .single();
          evaluation = {
            triggered: !evErr && !!event?.id,
            eventId: event?.id ?? null,
            currentPrice,
            bestStore: latestPrice?.best_store ?? null,
          };
        } else {
          evaluation = { triggered: false, reason: "deduped", currentPrice };
        }
      } else {
        evaluation = {
          triggered: false,
          reason: currentPrice > target ? "above_target" : "no_price",
          currentPrice: Number.isFinite(currentPrice) ? currentPrice : null,
        };
      }
    }

    if (evaluation?.triggered && evaluation.eventId && serviceRoleKey) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-alert-emails`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ limit: 20 }),
        });
      } catch (_e) {
        /* email delivery is non-fatal */
      }
    }

    return json(200, { ok: true, alert: data, evaluation });
  } catch (error) {
    return json(500, { ok: false, error: "unexpected_error", detail: String(error) });
  }
});
