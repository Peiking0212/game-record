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
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,game_id" },
      )
      .select("*")
      .single();

    if (error) {
      return json(500, { ok: false, error: "upsert_failed", detail: error.message });
    }

    return json(200, { ok: true, alert: data });
  } catch (error) {
    return json(500, { ok: false, error: "unexpected_error", detail: String(error) });
  }
});
