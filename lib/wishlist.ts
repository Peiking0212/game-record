import { STORAGE_KEYS } from "@/lib/game-data";

export type WishlistItem = {
  id: string;
  name: string;
  cover?: string;
  platform?: string;
  rating: number; // 1-5
  priority: "high" | "medium" | "low";
  price?: string; // user-entered target/expected price (string for legacy compat)
  notes?: string;
  date: string; // ISO
  // cloud-related fields (legacy kept for compatibility; optional)
  supabaseGameId?: number;
  steamAppId?: number;
  _fromSupabase?: boolean;
};

export type DealWatchRules = {
  enabled?: boolean;
  minDiscountPercent?: number;
  preferredPlatforms?: string[];
  notifyOnlyNewLows?: boolean;
  targetPriceByWishlistId?: Record<string, number>;
  dismissedAlertEventIds?: number[];
  updatedAt?: string;
};

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  return parseJson<WishlistItem[]>(
    localStorage.getItem(STORAGE_KEYS.WISHLIST),
    [],
  );
}

export function saveWishlist(items: WishlistItem[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(items));
    return true;
  } catch (e) {
    console.error("[wishlist] save failed", e);
    return false;
  }
}

export function getDealWatchRules(): DealWatchRules {
  if (typeof window === "undefined") return {};
  const rules = parseJson<DealWatchRules>(
    localStorage.getItem(STORAGE_KEYS.DEAL_WATCH_RULES),
    {},
  );
  // normalize
  rules.enabled = rules.enabled !== false;
  rules.minDiscountPercent = Math.max(
    1,
    Math.min(95, Number(rules.minDiscountPercent ?? 30) || 30),
  );
  rules.preferredPlatforms = Array.isArray(rules.preferredPlatforms)
    ? rules.preferredPlatforms
    : [];
  rules.notifyOnlyNewLows = rules.notifyOnlyNewLows !== false;
  rules.targetPriceByWishlistId =
    rules.targetPriceByWishlistId && typeof rules.targetPriceByWishlistId === "object"
      ? rules.targetPriceByWishlistId
      : {};
  return rules;
}

export function saveDealWatchRules(rules: DealWatchRules): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(STORAGE_KEYS.DEAL_WATCH_RULES, JSON.stringify(rules));
    return true;
  } catch (e) {
    console.error("[wishlist] save deal rules failed", e);
    return false;
  }
}

export function parsePlatformList(raw: string): string[] {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);
}

export function priorityLabel(p: WishlistItem["priority"]): string {
  const map: Record<WishlistItem["priority"], string> = {
    high: "高优先级",
    medium: "中优先级",
    low: "低优先级",
  };
  return map[p];
}

export function priorityClass(p: WishlistItem["priority"]): string {
  const map: Record<WishlistItem["priority"], string> = {
    high: "high",
    medium: "medium",
    low: "low",
  };
  return map[p];
}

