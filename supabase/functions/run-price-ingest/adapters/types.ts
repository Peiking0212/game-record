export type PriceQuote = {
  store: string;
  region: string;
  currency: string;
  price: number;
  originalPrice: number | null;
  discountPct: number | null;
  /** Persisted to price_snapshots.meta (no secrets). */
  meta?: Record<string, unknown>;
};

export type PriceFetchResult = PriceQuote | PriceQuote[] | null;

export type PriceAdapter = {
  store: string;
  /** primary = ITAD multi-store; fallback = Steam / CheapShark when ITAD unavailable */
  role: "primary" | "fallback";
  fetchBySteamAppId: (
    steamAppId: number,
    gameTitle?: string | null,
  ) => Promise<PriceFetchResult>;
};

export type AdapterAttempt = {
  store: string;
  ok: boolean;
  skipped?: boolean;
  skipReason?: string;
  error?: string;
  quote?: PriceQuote | null;
  quotes?: PriceQuote[];
};

export function normalizeQuotes(result: PriceFetchResult): PriceQuote[] {
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}
