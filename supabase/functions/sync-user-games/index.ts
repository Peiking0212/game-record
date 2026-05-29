import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STEAM_OWNED = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type SteamOwnedGame = {
  appid: number;
  name?: string;
  playtime_forever?: number;
  img_icon_url?: string;
  rtime_last_played?: number;
};

function steamHeaderUrl(appId: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchSteamLibrary(steamId: string, apiKey: string): Promise<SteamOwnedGame[]> {
  const url =
    `${STEAM_OWNED}?key=${encodeURIComponent(apiKey)}&steamid=${encodeURIComponent(steamId)}` +
    `&include_appinfo=1&include_played_free_games=1&format=json`;
  const res = await fetch(url, {
    headers: { "User-Agent": "PeikingGameTime/1.0 (+sync-user-games)" },
  });
  if (!res.ok) throw new Error(`steam_http_${res.status}`);
  const body = await res.json().catch(() => ({})) as {
    response?: { game_count?: number; games?: SteamOwnedGame[] };
  };
  return body?.response?.games || [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const steamApiKey = Deno.env.get("STEAM_WEB_API_KEY") || "";
    const authHeader = req.headers.get("Authorization") || "";

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !authHeader) {
      return json(500, { ok: false, error: "missing_function_env_or_auth" });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return json(401, { ok: false, error: "unauthorized" });
    }
    const userId = authData.user.id;

    const payload = await req.json().catch(() => ({}));

    // ---- Backward-compatible manual mode: explicit gameId arrays ----
    const ownedGameIds = Array.isArray(payload?.ownedGameIds) ? payload.ownedGameIds : [];
    const wishlistGameIds = Array.isArray(payload?.wishlistGameIds) ? payload.wishlistGameIds : [];
    const bodySteamId = String(payload?.steamId || "").replace(/\D/g, "");
    const persistSteamId = payload?.persistSteamId !== false;

    if (ownedGameIds.length > 0 || wishlistGameIds.length > 0) {
      const rows = [
        ...ownedGameIds.map((gameId: number) => ({ user_id: userId, game_id: gameId, source: "owned" })),
        ...wishlistGameIds.map((gameId: number) => ({ user_id: userId, game_id: gameId, source: "wishlist" })),
      ];
      const { error } = await admin.from("user_games").upsert(rows, {
        onConflict: "user_id,game_id,source",
      });
      if (error) return json(500, { ok: false, error: "sync_failed", detail: error.message });
      return json(200, { ok: true, mode: "manual", userId, syncedCount: rows.length });
    }

    // ---- Steam library mode ----
    // Resolve SteamID64: body wins, else stored profile.
    let steamId = bodySteamId;
    if (!steamId) {
      const { data: profile } = await admin
        .from("profiles")
        .select("steam_id")
        .eq("id", userId)
        .maybeSingle();
      steamId = String(profile?.steam_id || "").replace(/\D/g, "");
    }

    if (!steamId) {
      return json(400, {
        ok: false,
        error: "missing_steam_id",
        hint: "Provide steamId (SteamID64) in the body or set profiles.steam_id first.",
      });
    }
    if (!steamApiKey) {
      return json(500, {
        ok: false,
        error: "missing_steam_api_key",
        hint: "Set STEAM_WEB_API_KEY in Edge Function secrets.",
      });
    }

    // Persist SteamID on the profile for future cron / re-sync.
    if (persistSteamId) {
      await admin
        .from("profiles")
        .upsert({ id: userId, steam_id: steamId }, { onConflict: "id" });
    }

    let library: SteamOwnedGame[];
    try {
      library = await fetchSteamLibrary(steamId, steamApiKey);
    } catch (e) {
      return json(502, { ok: false, error: "steam_fetch_failed", detail: String(e) });
    }

    if (library.length === 0) {
      await admin
        .from("profiles")
        .update({ steam_synced_at: new Date().toISOString() })
        .eq("id", userId);
      return json(200, {
        ok: true,
        mode: "steam",
        userId,
        ownedCount: 0,
        message: "No games returned. Ensure the Steam profile/game details are public.",
      });
    }

    // 1) Upsert catalog rows (one per appid) and read back ids.
    const gameRows = library
      .filter((g) => g.appid && g.name)
      .map((g) => ({
        steam_app_id: g.appid,
        name: g.name as string,
        cover_url: steamHeaderUrl(g.appid),
        updated_at: new Date().toISOString(),
      }));

    const appIdToGameId = new Map<number, number>();
    for (const batch of chunk(gameRows, 200)) {
      const { data, error } = await admin
        .from("games")
        .upsert(batch, { onConflict: "steam_app_id" })
        .select("id, steam_app_id");
      if (error) return json(500, { ok: false, error: "games_upsert_failed", detail: error.message });
      (data || []).forEach((row: { id: number; steam_app_id: number }) => {
        appIdToGameId.set(Number(row.steam_app_id), Number(row.id));
      });
    }

    // 2) Upsert user_games (source='owned') with playtime + last played.
    const nowIso = new Date().toISOString();
    const userGameRows = library
      .map((g) => {
        const gameId = appIdToGameId.get(Number(g.appid));
        if (!gameId) return null;
        const last = g.rtime_last_played && g.rtime_last_played > 0
          ? new Date(g.rtime_last_played * 1000).toISOString()
          : null;
        return {
          user_id: userId,
          game_id: gameId,
          source: "owned",
          playtime_minutes: Number(g.playtime_forever) || 0,
          last_played_at: last,
          updated_at: nowIso,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    let syncedCount = 0;
    for (const batch of chunk(userGameRows, 300)) {
      const { error } = await admin
        .from("user_games")
        .upsert(batch, { onConflict: "user_id,game_id,source" });
      if (error) return json(500, { ok: false, error: "user_games_upsert_failed", detail: error.message });
      syncedCount += batch.length;
    }

    await admin
      .from("profiles")
      .update({ steam_synced_at: nowIso })
      .eq("id", userId);

    return json(200, {
      ok: true,
      mode: "steam",
      userId,
      steamId,
      gameCount: library.length,
      ownedCount: syncedCount,
      message: "Synced Steam library into user_games (source='owned').",
    });
  } catch (error) {
    return json(500, { ok: false, error: "unexpected_error", detail: String(error) });
  }
});
