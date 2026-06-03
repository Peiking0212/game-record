import type { GameRecord } from "@/lib/game-types";
import { daysAgo } from "@/lib/game-utils";

export const STORAGE_KEYS = {
  GAMES: "games",
  ACHIEVEMENTS: "achievements",
  LEGACY_ACHIEVEMENTS: "game_record_achievements",
  MEDIA: "game_record_media",
  PROFILE: "profile",
  WISHLIST: "game_record_wishlist",
  DEAL_WATCH_RULES: "deal_watch_rules",
  USER_INTEREST_PROFILE: "user_interest_profile",
  REVIEWS: "game_record_reviews",
  SPENDING: "game_record_spending",
  GAME_NEWS_FEED: "game_news_feed",
  DISCOUNT_DEALS: "discount_deals",
  FOLLOWED_GAME_DICTIONARY: "followed_game_dictionary",
} as const;

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return parseJson(localStorage.getItem(key), fallback);
}

function writeJson(key: string, data: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("保存失败:", key, e);
    return false;
  }
}

export function getGames(): GameRecord[] {
  return readJson<GameRecord[]>(STORAGE_KEYS.GAMES, []);
}

export function saveGames(games: GameRecord[]): boolean {
  const ok = writeJson(STORAGE_KEYS.GAMES, games);
  if (ok) bootstrapFollowedGameDictionaryFromGames(games);
  return ok;
}

type SampleGame = GameRecord & { lastPlayedDaysAgo?: number };

function hydrateGame(item: SampleGame): GameRecord {
  const g = { ...item };
  if (g.lastPlayedDaysAgo != null) {
    g.lastPlayed = daysAgo(g.lastPlayedDaysAgo);
    delete g.lastPlayedDaysAgo;
  }
  if (g.icon?.startsWith("assets/")) {
    g.icon = `/${g.icon}`;
  }
  return g;
}

export function bootstrapFollowedGameDictionaryFromGames(
  games: GameRecord[],
): void {
  if (typeof window === "undefined") return;
  const existing = readJson<
    Array<{ gameId: string; nameZh?: string; aliases?: string[] }>
  >(STORAGE_KEYS.FOLLOWED_GAME_DICTIONARY, []);

  const byId = new Map(
    existing.map((e) => [String(e.gameId), { ...e }]),
  );

  games.forEach((game) => {
    const gameId = String(game.id);
    const name = String(game.name || "").trim();
    if (!gameId || !name) return;
    const current = byId.get(gameId);
    if (current) {
      if (!current.nameZh) current.nameZh = name;
      const aliases = new Set(current.aliases ?? []);
      aliases.add(name);
      current.aliases = [...aliases];
    } else {
      byId.set(gameId, { gameId, nameZh: name, aliases: [name] });
    }
  });

  writeJson(STORAGE_KEYS.FOLLOWED_GAME_DICTIONARY, [...byId.values()]);
}

export async function seedGamesIfEmpty(): Promise<GameRecord[]> {
  let games = getGames();
  if (games.length > 0) {
    bootstrapFollowedGameDictionaryFromGames(games);
    return games;
  }

  try {
    const res = await fetch("/data/samples.json");
    if (!res.ok) return games;
    const samples = (await res.json()) as { games?: SampleGame[] };
    games = (samples.games ?? []).map(hydrateGame);
    if (games.length > 0) saveGames(games);
  } catch (e) {
    console.warn("[seedGamesIfEmpty]", e);
  }

  return games;
}

export type AchievementRecord = {
  id?: number | string;
  title?: string;
  gameName?: string;
  description?: string;
  date?: string;
  icon?: string;
};

export type ReviewRecord = {
  id?: number | string;
  name?: string;
  gameName?: string;
  gameId?: number | string;
  rating?: number;
  review?: string;
  comment?: string;
  tags?: string[];
  coverUrl?: string;
  cover?: string;
  date?: string;
};

export type SpendingRecord = {
  id?: number | string;
  game?: string;
  gameId?: number | string;
  amount?: number | string;
  date?: string;
  platform?: string;
  note?: string;
  recordType?: string;
  wishlistId?: number | string;
};

export type MediaRecord = {
  type?: string;
  url?: string;
  thumbnail?: string;
  gameName?: string;
  gameId?: number | string;
};

export function migrateLegacyAchievements(): AchievementRecord[] {
  let list = readJson<AchievementRecord[]>(STORAGE_KEYS.ACHIEVEMENTS, []);
  if (list.length > 0) return list;

  const legacy = readJson<
    Array<{
      id?: number | string;
      title?: string;
      name?: string;
      gameName?: string;
      game?: string;
      description?: string;
      date?: string;
      icon?: string;
      unlocked?: boolean;
    }>
  >(STORAGE_KEYS.LEGACY_ACHIEVEMENTS, []);

  if (legacy.length === 0) return list;

  list = legacy
    .filter((a) => a.unlocked !== false)
    .map((a, i) => ({
      id: a.id ?? Date.now() + i,
      title: a.title || a.name || "未知成就",
      gameName: a.gameName || a.game || "",
      description: a.description || "",
      date: a.date || "",
      icon: a.icon || "trophy",
    }));

  if (list.length > 0) writeJson(STORAGE_KEYS.ACHIEVEMENTS, list);
  return list;
}

export function getAchievements(): AchievementRecord[] {
  return migrateLegacyAchievements();
}

export function getReviews(): ReviewRecord[] {
  return readJson<ReviewRecord[]>(STORAGE_KEYS.REVIEWS, []);
}

export function getSpending(): SpendingRecord[] {
  return readJson<SpendingRecord[]>(STORAGE_KEYS.SPENDING, []);
}

export function getMedia(): MediaRecord[] {
  return readJson<MediaRecord[]>(STORAGE_KEYS.MEDIA, []);
}

export function saveMedia(items: MediaRecord[]): boolean {
  return writeJson(STORAGE_KEYS.MEDIA, items);
}

export function getGameById(id: string | number | null | undefined) {
  if (id == null || id === "") return null;
  return getGames().find((g) => String(g.id) === String(id)) ?? null;
}

export function resolveGameFieldsFromSelect(
  gameId: string | number | null | undefined,
) {
  const game = getGameById(gameId);
  return {
    gameId: game ? game.id : gameId || null,
    gameName: game ? game.name : "",
    name: game ? game.name : "",
  };
}

export function getCachedPersonalizedFeed() {
  return {
    news: readJson<
      Array<{
        gameName?: string;
        title?: string;
        summary?: string;
      }>
    >(STORAGE_KEYS.GAME_NEWS_FEED, []),
    deals: readJson<
      Array<{
        gameName?: string;
        platform?: string;
        discountPercent?: number;
        currentPrice?: number;
        originalPrice?: number;
      }>
    >(STORAGE_KEYS.DISCOUNT_DEALS, []),
  };
}

export function achievementDateMs(a: AchievementRecord): number {
  if (!a?.date) return 0;
  const m = String(a.date).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
  const d = new Date(a.date);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export function getHomeStats() {
  const games = getGames();
  const achievements = getAchievements();
  const totalHours = games.reduce(
    (sum, g) => sum + (parseInt(String(g.playtime), 10) || 0),
    0,
  );
  const ratings = games
    .filter((g) => (g.progress ?? 0) > 0)
    .map((g) => Math.ceil((g.progress ?? 0) / 20));
  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : "0.0";

  return {
    totalGames: games.length,
    totalHours,
    totalAchievements: achievements.length,
    avgRating,
    recentGames: [...games]
      .sort(
        (a, b) =>
          (parseInt(String(b.playtime), 10) || 0) -
          (parseInt(String(a.playtime), 10) || 0),
      )
      .slice(0, 4),
  };
}
