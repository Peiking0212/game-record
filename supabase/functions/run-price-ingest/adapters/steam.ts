import type { PriceAdapter } from "./types.ts";

type SteamAppDetailsResponse = {
  [appId: string]: {
    success?: boolean;
    data?: {
      price_overview?: {
        currency?: string;
        initial?: number;
        final?: number;
        discount_percent?: number;
      };
    };
  };
};

/** Steam Store appdetails (no API key). Always queried first. */
export function createSteamAdapter(): PriceAdapter {
  const cc = Deno.env.get("STEAM_STORE_CC") || "cn";
  const lang = Deno.env.get("STEAM_STORE_LANG") || "schinese";

  return {
    store: "steam",
    role: "primary",
    async fetchBySteamAppId(steamAppId: number) {
      if (!Number.isFinite(steamAppId) || steamAppId <= 0) return null;

      const url =
        `https://store.steampowered.com/api/appdetails?appids=${steamAppId}&cc=${cc}&l=${lang}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "PeikingGameTime/1.0 (+price-ingest)" },
      });
      if (!res.ok) return null;

      const body = (await res.json()) as SteamAppDetailsResponse;
      const entry = body[String(steamAppId)];
      if (!entry?.success || !entry.data?.price_overview) return null;

      const overview = entry.data.price_overview;
      const finalCents = overview.final ?? 0;
      const initialCents = overview.initial ?? finalCents;
      const currency = overview.currency || "CNY";

      return {
        store: "steam",
        region: cc.toUpperCase(),
        currency,
        price: finalCents / 100,
        originalPrice: initialCents / 100,
        discountPct: overview.discount_percent ?? null,
        meta: { source: "steam_appdetails" },
      };
    },
  };
}
