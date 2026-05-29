import type { PriceAdapter } from "./types.ts";

type CheapSharkGame = {
  gameID?: string;
  steamAppID?: string | null;
  external?: string;
  cheapest?: string;
  cheapestDealID?: string;
};

type CheapSharkDeal = {
  salePrice?: string;
  normalPrice?: string;
  savings?: string;
  storeID?: string;
};

const STEAM_STORE_ID = "1";

/** CheapShark public API (no key). Fallback when Steam has no price_overview. */
export function createCheapSharkAdapter(): PriceAdapter {
  return {
    store: "cheapshark",
    role: "fallback",
    async fetchBySteamAppId(steamAppId: number, gameTitle?: string | null) {
      if ((!Number.isFinite(steamAppId) || steamAppId <= 0) && !gameTitle?.trim()) {
        return null;
      }

      const params = new URLSearchParams({ pageSize: "5" });
      if (steamAppId > 0) params.set("steamAppID", String(steamAppId));
      else if (gameTitle?.trim()) params.set("title", gameTitle.trim());

      const gamesRes = await fetch(
        `https://www.cheapshark.com/api/1.0/games?${params}`,
        { headers: { "User-Agent": "PeikingGameTime/1.0 (+price-ingest)" } },
      );
      if (!gamesRes.ok) return null;

      const games = (await gamesRes.json()) as CheapSharkGame[];
      const match =
        games.find((g) => String(g.steamAppID || "") === String(steamAppId)) ||
        games[0];
      if (!match?.cheapestDealID) return null;

      const dealRes = await fetch(
        `https://www.cheapshark.com/api/1.0/deals?id=${encodeURIComponent(match.cheapestDealID)}`,
        { headers: { "User-Agent": "PeikingGameTime/1.0 (+price-ingest)" } },
      );
      if (!dealRes.ok) return null;

      const deal = (await dealRes.json()) as CheapSharkDeal;
      const price = Number(deal.salePrice);
      const original = Number(deal.normalPrice);
      if (!Number.isFinite(price) || price < 0) return null;

      const discountPct = Number.isFinite(Number(deal.savings))
        ? Math.round(Number(deal.savings))
        : original > price
          ? Math.round((1 - price / original) * 100)
          : null;

      return {
        store: "cheapshark",
        region: "US",
        currency: "USD",
        price,
        originalPrice: Number.isFinite(original) ? original : null,
        discountPct,
        meta: {
          source: "cheapshark",
          cheapshark_game_id: match.gameID ?? null,
          cheapshark_deal_id: match.cheapestDealID,
          cheapshark_store_id: deal.storeID ?? null,
          underlying_store_is_steam: deal.storeID === STEAM_STORE_ID,
        },
      };
    },
  };
}
