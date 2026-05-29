import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STEAM_SEARCH = "https://store.steampowered.com/api/storesearch/";
const ITAD_BASE = "https://api.isthereanydeal.com";
const STEAM_CC = (Deno.env.get("STEAM_STORE_CC") || "cn").toLowerCase();
const STEAM_LANG = (Deno.env.get("STEAM_STORE_LANG") || "schinese").toLowerCase();

type SteamSearchItem = {
  id?: number;
  name?: string;
  tiny_image?: string;
  type?: string;
};

type Candidate = {
  steamAppId: number | null;
  name: string;
  coverUrl: string | null;
  source: "steam" | "itad" | "manual";
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function searchVariants(query: string): string[] {
  const raw = query.trim();
  const set = new Set<string>();
  if (raw.length >= 2) set.add(raw);
  const xNorm = raw.replace(/[×✕]/g, " x ").replace(/\s+/g, " ").trim();
  if (xNorm.length >= 2) set.add(xNorm);
  const ascii = raw.replace(/[×✕·:™®©]/g, " ").replace(/\s+/g, " ").trim();
  if (ascii.length >= 2) set.add(ascii);
  const noSpace = ascii.replace(/\s+/g, "");
  if (noSpace.length >= 2) set.add(noSpace);
  return [...set];
}

async function searchSteamStore(query: string): Promise<Candidate[]> {
  const url =
    `${STEAM_SEARCH}?term=${encodeURIComponent(query)}&l=${STEAM_LANG}&cc=${STEAM_CC}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "PeikingGameTime/1.0 (+lookup-game)" },
  });
  if (!res.ok) return [];
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

async function searchSteamAllVariants(query: string): Promise<Candidate[]> {
  const seen = new Set<number>();
  const merged: Candidate[] = [];
  for (const variant of searchVariants(query)) {
    const batch = await searchSteamStore(variant);
    for (const c of batch) {
      if (c.steamAppId == null || seen.has(c.steamAppId)) continue;
      seen.add(c.steamAppId);
      merged.push(c);
      if (merged.length >= 8) return merged;
    }
  }
  return merged;
}

type ItadSearchHit = { id?: string; title?: string; type?: string };

async function searchItad(query: string): Promise<Candidate | null> {
  const apiKey = Deno.env.get("ITAD_API_KEY")?.trim();
  if (!apiKey) return null;

  for (const variant of searchVariants(query)) {
    const url =
      `${ITAD_BASE}/games/search/v1?q=${encodeURIComponent(variant)}&key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "PeikingGameTime/1.0 (+lookup-game)", "ITAD-API-Key": apiKey },
    });
    if (!res.ok) continue;
    const hits = (await res.json()) as ItadSearchHit[];
    const game = hits.find((h) => h.type === "game" || !h.type) || hits[0];
    if (!game?.id || !game.title) continue;

    const lookupRes = await fetch(
      `${ITAD_BASE}/games/lookup/v1?title=${encodeURIComponent(game.title)}&key=${encodeURIComponent(apiKey)}`,
      { headers: { "ITAD-API-Key": apiKey } },
    );
    if (!lookupRes.ok) {
      return { steamAppId: null, name: game.title, coverUrl: null, source: "itad" };
    }
    const lookup = await lookupRes.json() as { found?: boolean; game?: { id?: string; title?: string } };
    if (!lookup.found) {
      return { steamAppId: null, name: game.title, coverUrl: null, source: "itad" };
    }

    const steamLookup = await fetch(
      `${ITAD_BASE}/lookup/id/shop/61/v1?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "ITAD-API-Key": apiKey },
        body: JSON.stringify([game.id]),
      },
    );
    if (steamLookup.ok) {
      const map = await steamLookup.json() as Record<string, string>;
      const shopId = map[game.id!];
      const steamAppId = shopId ? Number(String(shopId).replace(/\D/g, "")) : NaN;
      if (Number.isFinite(steamAppId) && steamAppId > 0) {
        return {
          steamAppId,
          name: game.title,
          coverUrl: null,
          source: "itad",
        };
      }
    }
    return { steamAppId: null, name: game.title, coverUrl: null, source: "itad" };
  }
  return null;
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

async function upsertGame(
  admin: ReturnType<typeof createClient>,
  pick: Candidate,
): Promise<Record<string, unknown>> {
  if (pick.steamAppId != null && pick.steamAppId > 0) {
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
    if (error) throw error;
    return data as Record<string, unknown>;
  }

  const { data: existing } = await admin
    .from("games")
    .select("id, steam_app_id, name, cover_url")
    .ilike("name", pick.name)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { data, error } = await admin
      .from("games")
      .update({
        cover_url: pick.coverUrl ?? existing.cover_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("id, steam_app_id, name, cover_url")
      .single();
    if (error) throw error;
    return data as Record<string, unknown>;
  }

  const { data, error } = await admin
    .from("games")
    .insert({
      steam_app_id: null,
      name: pick.name,
      cover_url: pick.coverUrl,
      updated_at: new Date().toISOString(),
    })
    .select("id, steam_app_id, name, cover_url")
    .single();
  if (error) throw error;
  return data as Record<string, unknown>;
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
    const allowManual = payload?.allowManual !== false;

    let pick: Candidate | null = null;
    let candidates: Candidate[] = [];
    let warning: string | null = null;

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
      candidates = await searchSteamAllVariants(query);
      if (candidates.length > 0) {
        pick = candidates[0];
      } else {
        const itadPick = await searchItad(query);
        if (itadPick) {
          pick = itadPick;
          candidates = [itadPick];
          if (itadPick.steamAppId == null) {
            warning = "not_on_steam";
          }
        } else if (allowManual) {
          pick = {
            steamAppId: null,
            name: query.replace(/[×✕]/g, "×").trim() || query,
            coverUrl: null,
            source: "manual",
          };
          candidates = [pick];
          warning = "not_on_steam";
        } else {
          return json(404, {
            ok: false,
            error: "not_found",
            query,
            hint: "该游戏可能不在 Steam（如 Switch 独占），可传 allowManual:true 按名称入库",
          });
        }
      }
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
      try {
        gameRow = await upsertGame(admin, pick);
      } catch (e) {
        return json(500, {
          ok: false,
          error: "upsert_game_failed",
          detail: String(e),
        });
      }

      if (pick.steamAppId != null && gameRow?.id) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/run-price-ingest`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ gameId: gameRow.id }),
          });
        } catch {
          /* non-fatal */
        }
      }
    }

    const message = warning === "not_on_steam"
      ? "该游戏可能不在 Steam（如 Switch/主机），已按名称加入云端；自动抓价可能不可用，请用手动目标价或本地价格。"
      : null;

    return json(200, {
      ok: true,
      query: query || null,
      candidates,
      game: gameRow,
      imported: !!gameRow,
      warning,
      message,
      pickSource: pick.source,
    });
  } catch (error) {
    return json(500, { ok: false, error: "unexpected_error", detail: String(error) });
  }
});
