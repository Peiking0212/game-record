import {
  achievementDateMs,
  getAchievements,
  getCachedPersonalizedFeed,
  getGames,
  getMedia,
  getReviews,
  getSpending,
  migrateLegacyAchievements,
  type AchievementRecord,
  type MediaRecord,
  type ReviewRecord,
  type SpendingRecord,
} from "@/lib/game-data";
import type { GameRecord } from "@/lib/game-types";
import { matchGameName } from "@/lib/game-utils";

type NameKey = "gameName" | "name";

/** 根据key从记录里取出游戏名 */
function getRecordGameName(
  record: { name?: string; gameName?: string; game?: string },
  nameKey: NameKey,
): string {
  if (nameKey === "name") return record.name || record.gameName || "";
  return record.gameName || record.game || record.name || "";
}

/** 判断一条记录是否归属指定游戏（优先gameId，其次名称模糊匹配） */
export function recordBelongsToGame(
  record: {
    gameId?: number | string | null;
    name?: string;
    gameName?: string;
    game?: string;
  },
  game: GameRecord,
  nameKey: NameKey = "gameName",
): boolean {
  if (!record || !game) return false;
  if (record.gameId != null && record.gameId !== "") {
    return String(record.gameId) === String(game.id);
  }
  return matchGameName(getRecordGameName(record, nameKey), game.name);
}

/** 根据id/名称查找游戏 */
export function findGame(
  games: GameRecord[],
  opts: { id?: string | null; name?: string | null },
): GameRecord | null {
  if (opts.id) {
    return games.find((g) => String(g.id) === String(opts.id)) ?? null;
  }
  if (opts.name) {
    const decoded = decodeURIComponent(opts.name);
    return games.find((g) => matchGameName(g.name, decoded)) ?? null;
  }
  return null;
}

/** 消费记录类型推断：purchase购入游戏 / recharge平台充值 */
export function getSpendingRecordType(s: SpendingRecord): "purchase" | "recharge" {
  if (s.recordType === "purchase" || s.recordType === "recharge") {
    return s.recordType;
  }
  if (s.wishlistId != null && s.wishlistId !== "") return "purchase";
  if (s.gameId != null && s.gameId !== "") return "recharge";
  const label = String(s.game || "")
    .trim()
    .toLowerCase();
  if (label === "平台充值") return "recharge";
  return "recharge";
}

/** 筛选属于当前游戏的消费记录 */
export function filterSpendingByGame(
  spendingList: SpendingRecord[],
  game: GameRecord,
): SpendingRecord[] {
  return spendingList.filter((s) => {
    const type = getSpendingRecordType(s);
    if (type === "recharge") {
      if (s.gameId != null && String(s.gameId) === String(game.id)) return true;
      if (
        !s.gameId &&
        matchGameName(s.game, game.name) &&
        String(s.game || "").trim() !== "平台充值"
      ) {
        return true;
      }
      return false;
    }
    if (type === "purchase" && matchGameName(s.game, game.name)) return true;
    return false;
  });
}

export type HubMediaItem = {
  type: "image" | "video";
  url: string;
  thumbnail?: string | null;
};

/** 聚合游戏截图+媒体库素材，去重生成画廊数据 */
export function buildMediaItems(
  game: GameRecord,
  galleryMedia: MediaRecord[],
): HubMediaItem[] {
  const items: HubMediaItem[] = [];
  const seenUrls = new Set<string>();

  function addItem(type: "image" | "video", url?: string, thumbnail?: string | null) {
    if (!url || seenUrls.has(url)) return;
    seenUrls.add(url);
    items.push({ type, url, thumbnail: thumbnail ?? null });
  }

  galleryMedia.forEach((item) => {
    const t = (item.type || "").toLowerCase() === "video" ? "video" : "image";
    addItem(t, item.url, item.thumbnail);
  });
  (game.screenshots || []).forEach((url) => addItem("image", url));
  (game.videos || []).forEach((url) => addItem("video", url));

  return items;
}

/** 自动根据游戏名称回填gameId，并同步name/gameName字段 */
export function migrateRecordGameId<
  T extends { gameId?: number | string; name?: string; gameName?: string },
>(
  record: T,
  nameKey: NameKey,
): T {
  const migrated = { ...record };
  const games = getGames();

  if (migrated.gameId != null && migrated.gameId !== "") {
    const linked = games.find((g) => String(g.id) === String(migrated.gameId));
    if (linked) {
      if (nameKey === "name") migrated.name = linked.name;
      else migrated.gameName = linked.name;
    }
    return migrated;
  }

  const name = getRecordGameName(migrated, nameKey);
  const gameMatch = games.find((g) => matchGameName(g.name, name));
  if (gameMatch) {
    migrated.gameId = gameMatch.id;
    if (nameKey === "name") migrated.name = gameMatch.name;
    else migrated.gameName = gameMatch.name;
  }
  return migrated;
}

/** 游戏详情页聚合全量数据结构 */
export type GameHubData = {
  game: GameRecord;
  reviews: ReviewRecord[];
  achievements: AchievementRecord[];
  mediaItems: HubMediaItem[];
  spending: SpendingRecord[];
  news: Array<{ gameName?: string; title?: string; summary?: string }>;
  deals: Array<{
    gameName?: string;
    platform?: string;
    discountPercent?: number;
    currentPrice?: number;
    originalPrice?: number;
  }>;
};

/** 一次性加载某个游戏主页全部关联数据：评测/成就/图库/消费/资讯/折扣 */
export function loadGameHubData(game: GameRecord): GameHubData {
  migrateLegacyAchievements();

  const reviews = getReviews()
    .map((r) => migrateRecordGameId(r, "name"))
    .filter((r) => recordBelongsToGame(r, game, "name"));

  const achievements = getAchievements()
    .filter((a) => recordBelongsToGame(a, game, "gameName"))
    .sort((a, b) => achievementDateMs(b) - achievementDateMs(a));

  const gallery = getMedia()
    .map((m) => migrateRecordGameId(m, "gameName"))
    .filter((m) => recordBelongsToGame(m, game, "gameName"));

  const mediaItems = buildMediaItems(game, gallery);
  const spending = filterSpendingByGame(getSpending(), game);

  const cached = getCachedPersonalizedFeed();
  const news = cached.news.filter((n) => matchGameName(n.gameName, game.name));
  const deals = cached.deals.filter((d) => matchGameName(d.gameName, game.name));

  return {
    game,
    reviews,
    achievements,
    mediaItems,
    spending,
    news,
    deals,
  };
}