import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STEAM_SEARCH = "https://store.steampowered.com/api/storesearch/";
const STEAM_CC = (Deno.env.get("STEAM_STORE_CC") || "cn").toLowerCase();
const STEAM_LANG = (Deno.env.get("STEAM_STORE_LANG") || "schinese").toLowerCase();

type SteamSearchItem = {
  id?: number;
  name?: string;
  tiny_image?: string;
  type?: string;
};

type Candidate = {
  steamAppId: number;
  name: string;
  coverUrl: string | null;
  source: "steam";
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function searchSteamStore(query: string): Promise<Candidate[]> {
  const url =
    `${STEAM_SEARCH}?term=${encodeURIComponent(query)}&l=${STEAM_LANG}&cc=${STEAM_CC}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "PeikingGameTime/1.0 (+lookup-game)" },
  });
  if (!res.ok) {
    throw new Error(`steam_search_http_${res.status}`);
  }
  const data = (await res.json()) as { items?: SteamSearchItem[] };
  const items = data.items || [];
  const out: Candidate[] = [];
  for (const item of items) {
    if (!item.id || !item.name) continue;
    if (item.type && item.type !== "app") continue;
    out.push({
      steamAppId: item.id,
      name: item.name,
      coverUrl: item.tiny_image || null,
      source: "steam",
    });
    if (out.length >= 8) break;
  }
  return out;
}

async function fetchSteamAppName(steamAppId: number): Promise<{ name: string; coverUrl: string | null }> {
  const url =
    `https://store.steampowered.com/api/appdetails?appids=${steamAppId}&cc=${STEAM_CC}&l=${STEAM_LANG}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "PeikingGameTime/1.0 (+lookup-game)" },
  });
  if (!res.ok) throw new Error(`steam_appdetails_http_${res.status}`);
  const body = await res.json() as Record<string, { success?: boolean; data?: { name?: string; header_image?: string } }>;
  const entry = body[String(steamAppId)];
  if (!entry?.success || !entry.data?.name) {
    throw new Error("steam_appdetails_not_found");
  }
  return {
    name: entry.data.name,
    coverUrl: entry.data.header_image || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const authHeader = req.headers.get("Authorization") || "";

    if (!supabaseUrl || !supabaseAnonKey || !authHeader) {
      return json(500, { ok: false, error: "missing_function_env_or_auth" });
    }
    if (!serviceRoleKey) {
      return json(500, { ok: false, error: "missing_service_role" });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return json(401, { ok: false, error: "unauthorized" });
    }

    const payload = await req.json().catch(() => ({}));
    const query = String(payload?.query || "").trim();
    const steamAppId = Number(payload?.steamAppId);
    const doImport = payload?.import !== false;

    let pick: Candidate | null = null;
    let candidates: Candidate[] = [];

    if (Number.isFinite(steamAppId) && steamAppId > 0) {
      const details = await fetchSteamAppName(steamAppId);
      pick = {
        steamAppId,
        name: details.name,
        coverUrl: details.coverUrl,
        source: "steam",
      };
      candidates = [pick];
    } else if (query.length >= 2) {
      candidates = await searchSteamStore(query);
      if (candidates.length === 0) {
        return json(404, { ok: false, error: "not_found", query });
      }
      pick = candidates[0];
    } else {
      return json(400, {
        ok: false,
        error: "invalid_payload",
        required: ["query (min 2 chars) or steamAppId"],
      });
    }

    if (!pick) {
      return json(404, { ok: false, error: "not_found" });
    }

    let gameRow: Record<string, unknown> | null = null;
    if (doImport) {
      const admin = createClient(supabaseUrl, serviceRoleKey);
      const { data, error } = await admin
        .from("games")
        .upsert(
          {
            steam_app_id: pick.steamAppId,
            name: pick.name,
            cover_url: pick.coverUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "steam_app_id" },
        )
        .select("id, steam_app_id, name, cover_url")
        .single();

      if (error) {
        return json(500, { ok: false, error: "upsert_game_failed", detail: error.message });
      }
      gameRow = data as Record<string, unknown>;

      // Fire-and-forget price ingest for this game (best effort)
      try {
        await fetch(`${supabaseUrl}/functions/v1/run-price-ingest`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ gameId: data.id }),
        });
      } catch {
        /* non-fatal */
      }
    }

    return json(200, {
      ok: true,
      query: query || null,
      candidates,
      game: gameRow,
      imported: !!gameRow,
    });
  } catch (error) {
    return json(500, { ok: false, error: "unexpected_error", detail: String(error) });
  }
});
