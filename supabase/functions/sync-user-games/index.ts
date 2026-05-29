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
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const authHeader = req.headers.get("Authorization") || "";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !authHeader) {
      return json(500, { ok: false, error: "missing_function_env_or_auth" });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return json(401, { ok: false, error: "unauthorized" });
    }

    const payload = await req.json().catch(() => ({}));
    const ownedGameIds = Array.isArray(payload?.ownedGameIds) ? payload.ownedGameIds : [];
    const wishlistGameIds = Array.isArray(payload?.wishlistGameIds) ? payload.wishlistGameIds : [];
    if (!Array.isArray(ownedGameIds) || !Array.isArray(wishlistGameIds)) {
      return json(400, { ok: false, error: "invalid_payload" });
    }

    const rows = [
      ...ownedGameIds.map((gameId: number) => ({ user_id: authData.user.id, game_id: gameId, source: "owned" })),
      ...wishlistGameIds.map((gameId: number) => ({ user_id: authData.user.id, game_id: gameId, source: "wishlist" })),
    ];

    if (rows.length > 0) {
      const { error } = await adminClient.from("user_games").upsert(rows, {
        onConflict: "user_id,game_id,source",
      });
      if (error) {
        return json(500, { ok: false, error: "sync_failed", detail: error.message });
      }
    }

    return json(200, {
      ok: true,
      userId: authData.user.id,
      syncedCount: rows.length,
      message: "MVP skeleton synced user games.",
    });
  } catch (error) {
    return json(500, { ok: false, error: "unexpected_error", detail: String(error) });
  }
});
