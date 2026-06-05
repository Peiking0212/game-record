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
  steam_app_id: number | null;
  name: string;
  cover_url: string | null;
};

type BestPriceRow = {
  game_id: number;
  price: number;
  currency?: string | null;
  best_store?: string | null;
  discount_pct?: number | null;
  captured_at?: string | null;
  meta?: { historical_low?: number } | null;
};

let catalogCache: WishlistItem[] | null = null;

export function invalidateWishlistCatalogCache(): void {
  catalogCache = null;
  invalidateAlertContext();
}

function formatStoreLabel(store: string | null | undefined): string {
  if (!store) return "Steam";
  const s = String(store);
  if (s === "gog") return "GOG";
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
  return data as CatalogGame[];
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
  (pricesRes.data as BestPriceRow[] | null)?.forEach((row) => {
    priceByGameId[String(row.game_id)] = row;
  });

  return gamesRes.data.map((g, idx) => {
    const priceRow = priceByGameId[String(g.id)];
    let platform = formatStoreLabel(priceRow?.best_store);
    let notes = "鏉ヨ嚜 Supabase 鐩綍";
    if (priceRow) {
      notes = `鏈€浣庝环 ${priceRow.price} ${priceRow.currency || ""} 路 ${formatStoreLabel(priceRow.best_store)}`;
      if (priceRow.discount_pct) notes += ` 路 鎶樻墸 ${priceRow.discount_pct}%`;
      if (priceRow.meta?.historical_low != null) {
        notes += ` 路 鍙蹭綆 ${priceRow.meta.historical_low}`;
      }
    }
    return {
      id: `sb_${g.id}_${idx}`,
      supabaseGameId: g.id,
      steamAppId: g.steam_app_id ?? undefined,
      name: g.name,
      cover: g.cover_url || "",
      platform,
      rating: 3,
      priority: "medium" as const,
      price: priceRow ? String(priceRow.price) : "",
      notes,
      date: priceRow?.captured_at || new Date().toISOString(),
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
  (pricesRes.data as BestPriceRow[]).forEach((row) => {
    priceByGameId[String(row.game_id)] = row;
  });

  return list.map((item) => {
    const alias = getWishlistAlias(item.name);
    const wantSteamId = item.steamAppId || alias?.steamAppId;
    const wantName =
      alias?.name ? alias.name : normalizeWishlistGameName(item.name);

    const match = gamesRes.data!.find((g) => {
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
        normalizeWishlistGameName(g.name) === normalizeWishlistGameName(item.name)
      ) {
        return true;
      }
      if (
        g.name &&
        wantName &&
        normalizeWishlistGameName(g.name) === wantName
      ) {
        return true;
      }
      return false;
    });

    if (!match) return item;

    const priceRow = priceByGameId[String(match.id)];
    const next: WishlistItem = { ...item, supabaseGameId: match.id };
    if (!priceRow) return next;

    if (!next.price || next.price === "") next.price = String(priceRow.price);
    if (priceRow.best_store) {
      next.platform = formatStoreLabel(priceRow.best_store);
    }
    const priceNote =
      `鏈€浣庝环 ${priceRow.price}` +
      (priceRow.currency ? ` ${priceRow.currency}` : "") +
      (priceRow.best_store ? ` @${formatStoreLabel(priceRow.best_store)}` : "");
    next.notes = next.notes ? `${next.notes} 路 ${priceNote}` : priceNote;
    return next;
  });
}

/** Local list first; empty local 鈫?full cloud catalog; always enrich when logged in. */
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
