export type { PriceAdapter, PriceQuote, AdapterAttempt, PriceFetchResult } from "./types.ts";
export { normalizeQuotes } from "./types.ts";
export { createSteamAdapter } from "./steam.ts";
export { createItadAdapter } from "./itad.ts";
export { createCheapSharkAdapter } from "./cheapshark.ts";

import type { PriceAdapter } from "./types.ts";
import { createSteamAdapter } from "./steam.ts";
import { createItadAdapter } from "./itad.ts";
import { createCheapSharkAdapter } from "./cheapshark.ts";

export type AdapterRegistry = {
  itad: PriceAdapter | null;
  steam: PriceAdapter;
  cheapshark: PriceAdapter;
};

export function getAdapterRegistry(): AdapterRegistry {
  return {
    itad: createItadAdapter(),
    steam: createSteamAdapter(),
    cheapshark: createCheapSharkAdapter(),
  };
}

/** Logging order: primary ITAD → fallbacks. */
export function listAdapterStores(registry: AdapterRegistry): string[] {
  const stores: string[] = [];
  if (registry.itad) stores.push(registry.itad.store);
  stores.push(registry.steam.store, registry.cheapshark.store);
  return stores;
}
