import { STORAGE_KEYS } from "@/lib/game-data";
import { formatDateISO } from "@/lib/game-utils";

export type AchievementItem = {
  id: number | string;
  title: string;
  gameName: string;
  gameId?: number | string;
  description: string;
  date: string;
  icon: string;
  screenshot?: string;
};

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalize(item: Partial<AchievementItem>, index: number): AchievementItem {
  return {
    id: item.id ?? Date.now() + index,
    title: item.title || "未命名成就",
    gameName: item.gameName || "",
    gameId: item.gameId,
    description: item.description || "",
    date: formatDateISO(item.date) || "",
    icon: item.icon || "trophy",
    screenshot: item.screenshot,
  };
}

export function getAchievements(): AchievementItem[] {
  if (typeof window === "undefined") return [];
  const list = parseJson<Partial<AchievementItem>[]>(
    localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS),
    [],
  );
  return list.map(normalize);
}

export function saveAchievements(items: AchievementItem[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(items));
    return true;
  } catch (e) {
    console.error("[achievements] save failed", e);
    return false;
  }
}
