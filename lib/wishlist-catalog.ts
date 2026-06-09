import {
  getWishlistAlias,
  normalizeWishlistGameName,
} from "@/lib/wishlist-aliases";
import { invalidateAlertContext } from "@/lib/wishlist-alerts";
import { tryCreateClient } from "@/lib/supabase/client";
import type { WishlistItem } from "@/lib/wishlist";
import { getWishlist, saveWishlist } from "@/lib/wishlist";

export type CatalogGame = {
  id: number;
  steamAppId: number | null;
  name: string;
  coverUrl: string | null;
};

type BestPriceRow = {
  gameId: number;
  price: number;
  currency?: string | null;
  bestStore?: string | null;
  discountPct?: number | null;
  capturedAt?: string | null;
  meta?: { historicalLow?: number } | null;
};

let catalogCache: WishlistItem[] | null = null;

export function invalidateWishlistCatalogCache(): void {
  catalogCache = null;
  invalidateAlertContext();
}

function formatStoreLabel(store: string | null | undefined): string {
  if (!store) return "Steam";
  const s = String(store);
  if (s === "ea") return "EA";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function searchWishlistCatalog(query: string): Promise<CatalogGame[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = tryCreateClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("games")
    .select("id, steam_app_id, name, cover_url")
    .ilike("name", `%${q}%`)
    .order("name", { ascending: true })
    .limit(12);

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((g) => ({
    id: g.id as number,
    steamAppId: g.steam_app_id as number | null,
    name: g.name as string,
    coverUrl: g.cover_url as string | null,
  }));
}

export async function fetchSupabaseWishlistCatalog(): Promise<WishlistItem[]> {
  const supabase = tryCreateClient();
  if (!supabase) return [];

  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return [];

  const gamesRes = await supabase
    .from("games")
    .select("id, steam_app_id, name, cover_url");
  if (gamesRes.error || !gamesRes.data?.length) return [];

  const pricesRes = await supabase.from("game_best_prices").select("*");
  const priceByGameId: Record<string, BestPriceRow> = {};
  (pricesRes.data as Record<string, unknown>[] | null)?.forEach((row) => {
    const priceRow: BestPriceRow = {
      gameId: row.game_id as number,
      price: row.price as number,
      currency: row.currency as string | null | undefined,
      bestStore: row.best_store as string | null | undefined,
      discountPct: row.discount_pct as number | null | undefined,
      capturedAt: row.captured_at as string | null | undefined,
      meta: row.meta as { historicalLow?: number } | null | undefined,
    };
    priceByGameId[String(row.game_id)] = priceRow;
  });

  return (gamesRes.data as Record<string, unknown>[]).map((g, idx) => {
    const priceRow = priceByGameId[String(g.id)];
    let platform = formatStoreLabel(priceRow?.bestStore);
    let notes = "来自 Supabase 库";
    if (priceRow) {
      notes = `最低价 ${priceRow.price} ${priceRow.currency || ""} · ${formatStoreLabel(priceRow.bestStore)}`;
      if (priceRow.discountPct) notes += ` · 折扣 ${priceRow.discountPct}%`;
      if (priceRow.meta?.historicalLow != null) {
        notes += ` · 史低 ${priceRow.meta.historicalLow}`;
      }
    }
    return {
      id: `sb_${g.id}_${idx}`,
      supabaseGameId: g.id as number,
      steamAppId: (g.steam_app_id as number | null) ?? undefined,
      name: g.name as string,
      cover: (g.cover_url as string | null) || "",
      platform,
      rating: 3,
      priority: "medium" as const,
      price: priceRow ? String(priceRow.price) : "",
      notes,
      date: priceRow?.capturedAt || new Date().toISOString(),
      _fromSupabase: true,
    };
  });
}

export async function enrichWishlistFromSupabase(
  list: WishlistItem[],
): Promise<WishlistItem[]> {
  if (!list.length) return list;

  const supabase = tryCreateClient();
  if (!supabase) return list;

  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return list;

  const pricesRes = await supabase.from("game_best_prices").select("*");
  if (pricesRes.error || !pricesRes.data?.length) return list;

  const gamesRes = await supabase.from("games").select("id, name, steam_app_id");
  if (gamesRes.error || !gamesRes.data) return list;

  const priceByGameId: Record<string, BestPriceRow> = {};
  (pricesRes.data as Record<string, unknown>[]).forEach((row) => {
    const priceRow: BestPriceRow = {
      gameId: row.game_id as number,
      price: row.price as number,
      currency: row.currency as string | null | undefined,
      bestStore: row.best_store as string | null | undefined,
      discountPct: row.discount_pct as number | null | undefined,
      capturedAt: row.captured_at as string | null | undefined,
      meta: row.meta as { historicalLow?: number } | null | undefined,
    };
    priceByGameId[String(row.game_id)] = priceRow;
  });

  return list.map((item) => {
    const alias = getWishlistAlias(item.name);
    const wantSteamId = item.steamAppId || alias?.steamAppId;
    const wantName =
      alias?.name ? alias.name : normalizeWishlistGameName(item.name);

    const match = (gamesRes.data as Record<string, unknown>[]).find((g) => {
      if (item.supabaseGameId && String(g.id) === String(item.supabaseGameId)) {
        return true;
      }
      if (
        wantSteamId &&
        g.steam_app_id &&
        String(g.steam_app_id) === String(wantSteamId)
      ) {
        return true;
      }
      if (
        g.name &&
        item.name &&
        normalizeWishlistGameName(g.name as string) === normalizeWishlistGameName(item.name)
      ) {
        return true;
      }
      if (
        g.name &&
        wantName &&
        normalizeWishlistGameName(g.name as string) === wantName
      ) {
        return true;
      }
      return false;
    });

    if (!match) return item;

    const priceRow = priceByGameId[String(match.id)];
    const next: WishlistItem = { ...item, supabaseGameId: match.id as number };
    if (!priceRow) return next;

    if (!next.price || next.price === "") next.price = String(priceRow.price);
    if (priceRow.bestStore) {
      next.platform = formatStoreLabel(priceRow.bestStore);
    }
    const priceNote =
      `最低价 ${priceRow.price}` +
      (priceRow.currency ? ` ${priceRow.currency}` : "") +
      (priceRow.bestStore ? ` @${formatStoreLabel(priceRow.bestStore)}` : "");
    next.notes = next.notes ? `${next.notes} · ${priceNote}` : priceNote;
    return next;
  });
}

/** Local list first; empty local → full cloud catalog; always enrich when logged in. */
export async function loadWishlistWithFallback(): Promise<WishlistItem[]> {
  const local = getWishlist();
  if (local.length > 0) {
    const enriched = await enrichWishlistFromSupabase(local);
    if (enriched !== local) saveWishlist(enriched);
    return enriched;
  }
  if (catalogCache) return catalogCache.slice();
  catalogCache = await fetchSupabaseWishlistCatalog();
  return catalogCache.slice();
}
