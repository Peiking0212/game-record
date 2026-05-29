import type { PriceAdapter, PriceQuote } from "./types.ts";

const ITAD_BASE = "https://api.isthereanydeal.com";

/** ITAD shop id → stable store slug for price_snapshots.store */
const SHOP_ID_TO_STORE: Record<number, string> = {
  61: "steam",
  35: "gog",
  16: "humble",
  27: "gamersgate",
  28: "gamesplanet",
  29: "gamesrepublic",
  30: "indiegala",
  31: "itch",
  6: "fanatical",
  7: "gamebillet",
  11: "gamesload",
  13: "dlgamer",
  20: "greenmangaming",
  23: "nuuvem",
  25: "paradox",
  26: "playstation",
  33: "wingamestore",
  37: "chrono",
  44: "voidu",
  47: "macgamestore",
  49: "microsoft",
  50: "nuuvem",
  59: "epic",
  67: "etail",
};

type ItadLookupResponse = {
  found?: boolean;
  game?: { id?: string; title?: string };
};

type ItadMoney = {
  amount?: number;
  amountInt?: number;
  currency?: string;
};

type ItadDeal = {
  shop?: { id?: number; name?: string };
  price?: ItadMoney;
  regular?: ItadMoney;
  cut?: number;
  storeLow?: ItadMoney;
  url?: string;
  timestamp?: string;
  expiry?: string | null;
};

type ItadPricesEntry = {
  id?: string;
  historyLow?: {
    all?: ItadMoney;
    y1?: ItadMoney;
    m3?: ItadMoney;
  };
  deals?: ItadDeal[];
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function moneyToPrice(m?: ItadMoney | null): { price: number; currency: string } | null {
  if (!m) return null;
  if (typeof m.amount === "number" && Number.isFinite(m.amount)) {
    return { price: m.amount, currency: m.currency || "USD" };
  }
  if (typeof m.amountInt === "number" && Number.isFinite(m.amountInt)) {
    return { price: m.amountInt / 100, currency: m.currency || "USD" };
  }
  return null;
}

export function shopToStoreSlug(shop?: { id?: number; name?: string }): string {
  if (shop?.id != null && SHOP_ID_TO_STORE[shop.id]) {
    return SHOP_ID_TO_STORE[shop.id];
  }
  const name = (shop?.name || "unknown").toLowerCase();
  if (name.includes("steam")) return "steam";
  if (name === "gog" || name.includes("gog.com")) return "gog";
  if (name.includes("epic")) return "epic";
  if (name.includes("humble")) return "humble";
  if (name.includes("fanatical")) return "fanatical";
  if (name.includes("green man") || name.includes("greenmangaming")) return "greenmangaming";
  if (name.includes("microsoft") || name.includes("xbox")) return "microsoft";
  if (name.includes("playstation")) return "playstation";
  if (name.includes("ubisoft")) return "ubisoft";
  if (name.includes("origin") || name.includes("ea app")) return "ea";
  return name.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "unknown";
}

function dealToQuote(
  deal: ItadDeal,
  region: string,
  gameMeta: Record<string, unknown>,
): PriceQuote | null {
  const current = moneyToPrice(deal.price);
  if (!current) return null;
  const regular = moneyToPrice(deal.regular);
  const originalPrice = regular?.price ?? current.price;
  const discountPct =
    typeof deal.cut === "number"
      ? deal.cut
      : originalPrice > current.price
        ? Math.round((1 - current.price / originalPrice) * 100)
        : null;

  const storeLow = moneyToPrice(deal.storeLow);
  const meta: Record<string, unknown> = {
    ...gameMeta,
    source: "itad",
    itadShopId: deal.shop?.id ?? null,
    itadShopName: deal.shop?.name ?? null,
    dealUrl: deal.url || null,
    dealTimestamp: deal.timestamp ?? null,
    dealExpiry: deal.expiry ?? null,
  };
  if (storeLow) {
    meta.store_low = storeLow.price;
    meta.store_low_currency = storeLow.currency;
  }

  return {
    store: shopToStoreSlug(deal.shop),
    region,
    currency: current.currency,
    price: current.price,
    originalPrice,
    discountPct,
    meta,
  };
}

/** IsThereAnyDeal official API — primary multi-store source (ITAD_API_KEY required). */
export function createItadAdapter(): PriceAdapter | null {
  const apiKey = Deno.env.get("ITAD_API_KEY")?.trim();
  if (!apiKey) return null;

  const country = (Deno.env.get("ITAD_COUNTRY") || Deno.env.get("STEAM_STORE_CC") || "cn")
    .slice(0, 2)
    .toUpperCase();

  const requestDelayMs = Math.max(
    200,
    Number(Deno.env.get("ITAD_REQUEST_DELAY_MS") || "400") || 400,
  );

  async function itadFetch(path: string, init?: RequestInit): Promise<Response> {
    const sep = path.includes("?") ? "&" : "?";
    const url = `${ITAD_BASE}${path}${sep}key=${encodeURIComponent(apiKey)}`;
    await sleep(requestDelayMs);
    return fetch(url, {
      ...init,
      headers: {
        "User-Agent": "PeikingGameTime/1.0 (+price-ingest)",
        "ITAD-API-Key": apiKey,
        ...(init?.headers || {}),
      },
    });
  }

  return {
    store: "itad",
    role: "primary",
    async fetchBySteamAppId(steamAppId: number, gameTitle?: string | null) {
      if (!Number.isFinite(steamAppId) || steamAppId <= 0) return null;

      let lookupRes = await itadFetch(`/games/lookup/v1?appid=${steamAppId}`);
      if (!lookupRes.ok) {
        throw new Error(`itad_lookup_http_${lookupRes.status}`);
      }

      let lookup = (await lookupRes.json()) as ItadLookupResponse;
      if (!lookup.found && gameTitle?.trim()) {
        lookupRes = await itadFetch(
          `/games/lookup/v1?title=${encodeURIComponent(gameTitle.trim())}`,
        );
        if (!lookupRes.ok) {
          throw new Error(`itad_lookup_title_http_${lookupRes.status}`);
        }
        lookup = (await lookupRes.json()) as ItadLookupResponse;
      }

      const gameId = lookup.game?.id;
      if (!lookup.found || !gameId) return null;

      const pricesRes = await itadFetch(`/games/prices/v3?country=${country}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([gameId]),
      });
      if (!pricesRes.ok) {
        throw new Error(`itad_prices_http_${pricesRes.status}`);
      }

      const pricesBody = (await pricesRes.json()) as ItadPricesEntry[];
      const entry = pricesBody.find((p) => p.id === gameId) || pricesBody[0];
      if (!entry?.deals?.length) return null;

      const historyAll = moneyToPrice(entry.historyLow?.all);
      const historyY1 = moneyToPrice(entry.historyLow?.y1);
      const historyM3 = moneyToPrice(entry.historyLow?.m3);

      const gameMeta: Record<string, unknown> = {
        itad_game_id: gameId,
        itad_title: lookup.game?.title ?? null,
      };
      if (historyAll) {
        gameMeta.historical_low = historyAll.price;
        gameMeta.historical_low_currency = historyAll.currency;
      }
      if (historyY1) {
        gameMeta.historical_low_1y = historyY1.price;
        gameMeta.historical_low_1y_currency = historyY1.currency;
      }
      if (historyM3) {
        gameMeta.historical_low_3m = historyM3.price;
        gameMeta.historical_low_3m_currency = historyM3.currency;
      }

      const quotes: PriceQuote[] = [];
      const seenStores = new Set<string>();

      for (const deal of entry.deals) {
        const quote = dealToQuote(deal, country, gameMeta);
        if (!quote) continue;
        if (seenStores.has(quote.store)) continue;
        seenStores.add(quote.store);
        quotes.push(quote);
      }

      return quotes.length ? quotes : null;
    },
  };
}
