import { STORAGE_KEYS } from "@/lib/game-data";

export const REVIEW_TAGS = [
  "鍓ф儏浼樼",
  "鐜╂硶鍑轰紬",
  "鐢婚潰绮剧編",
  "闊充箰鍔ㄥ惉",
  "澶氫汉鏈夎叮",
  "浼戦棽鏀炬澗",
  "鎸戞垬鎬у己",
  "鍊煎緱閲嶇帺",
] as const;

export type ReviewItem = {
  id: string;
  gameId?: string | number;
  name: string;
  coverUrl?: string;
  cover?: string;
  rating: number; // 1-5
  tags?: string[];
  review?: string;
  comment?: string;
  playtime?: string;
  hours?: string;
  notes?: string;
  date: string; // ISO
};

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getReviews(): ReviewItem[] {
  if (typeof window === "undefined") return [];
  return parseJson<ReviewItem[]>(
    localStorage.getItem(STORAGE_KEYS.REVIEWS),
    [],
  );
}

export function saveReviews(items: ReviewItem[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(items));
    return true;
  } catch (e) {
    console.error("[reviews] save failed", e);
    return false;
  }
}

export function allUsedTags(items: ReviewItem[]): string[] {
  const set = new Set<string>();
  items.forEach((it) => (it.tags || []).forEach((t) => set.add(t)));
  return [...set.values()];
}

