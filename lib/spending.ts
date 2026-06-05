import { getSpending as getRawSpending, STORAGE_KEYS } from "@/lib/game-data";

export type SpendingRecordType = "purchase" | "recharge";

export type SpendingItem = {
  id: string;
  amount: number;
  date: string;
  platform: string;
  note: string;
  game: string;
  recordType: SpendingRecordType;
  gameId?: number | string;
  wishlistId?: number | string;
};

export const RECORD_TYPE_LABEL: Record<SpendingRecordType, string> = {
  purchase: "璐拱娓告垙",
  recharge: "璐︽埛鍏呭€?,
};

export const PLATFORM_OPTIONS = [
  "PC",
  "鎵嬫満",
  "PlayStation",
  "Xbox",
  "Switch",
  "Steam",
  "Epic",
  "鍏朵粬",
] as const;

export const DEFAULT_PLATFORM = "PC";
export const DEFAULT_GAME_LABEL = "璐︽埛鍏呭€?;

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function inferRecordType(item: {
  recordType?: string;
  wishlistId?: number | string;
  gameId?: number | string;
  game?: string;
}): SpendingRecordType {
  if (item.recordType === "purchase" || item.recordType === "recharge") {
    return item.recordType;
  }
  if (item.wishlistId != null && item.wishlistId !== "") return "purchase";
  if (item.gameId != null && item.gameId !== "") return "recharge";
  if ((item.game || "").trim() === DEFAULT_GAME_LABEL) return "recharge";
  return "purchase";
}

export function getSpending(): SpendingItem[] {
  const base = getRawSpending();
  if (!base.length) return [];

  return base.map((item, index) => ({
    id: String(item.id ?? `${Date.now()}-${index}`),
    amount: Number(item.amount) || 0,
    date: item.date || "",
    platform: item.platform || DEFAULT_PLATFORM,
    note: item.note || "",
    game: (item.game || "").trim() || DEFAULT_GAME_LABEL,
    recordType: inferRecordType(item),
    gameId: item.gameId,
    wishlistId: item.wishlistId,
  }));
}

export function saveSpending(items: SpendingItem[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(STORAGE_KEYS.SPENDING, JSON.stringify(items));
    return true;
  } catch (e) {
    console.error("[spending] save failed", e);
    return false;
  }
}

export function getSpendingYears(items: SpendingItem[]): string[] {
  const years = new Set<string>();
  for (const item of items) {
    const d = new Date(item.date);
    if (!Number.isNaN(d.getTime())) years.add(String(d.getFullYear()));
  }
  return [...years].sort((a, b) => Number(b) - Number(a));
}

export function filterSpendingByYear(
  items: SpendingItem[],
  year: string,
): SpendingItem[] {
  if (year === "all") return [...items];
  return items.filter((item) => {
    const d = new Date(item.date);
    return !Number.isNaN(d.getTime()) && String(d.getFullYear()) === year;
  });
}

export function platformClass(platform: string): string {
  switch (platform) {
    case "PC":
      return "platform-pc";
    case "鎵嬫満":
      return "platform-mobile";
    case "PlayStation":
    case "PS Store":
      return "platform-ps";
    case "Xbox":
      return "platform-xbox";
    case "Switch":
    case "Nintendo eShop":
      return "platform-nintendo";
    case "Steam":
      return "platform-steam";
    case "Epic":
      return "platform-epic";
    default:
      return "platform-other";
  }
}
