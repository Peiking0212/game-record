import { STORAGE_KEYS } from "@/lib/game-data";

export type PlayStyle = {
  singlePlayer: number;
  multiPlayer: number;
  pve: number;
  pvp: number;
};

export type UserProfile = {
  name: string;
  title: string;
  bio: string;
  avatar: string;
  tags: string[];
  joinDate: string;
  playStyle: PlayStyle;
  favoriteGames: Array<number | string>;
};

export const TAG_BADGE_CLASSES = [
  "badge-blue",
  "badge-orange",
  "badge-purple",
  "badge-green",
] as const;

export const DEFAULT_PLAY_STYLE: PlayStyle = {
  singlePlayer: 80,
  multiPlayer: 60,
  pve: 90,
  pvp: 40,
};

function lastYearMonth(month: number, day: number): string {
  const y = new Date().getFullYear() - 1;
  return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export const DEFAULT_PROFILE: UserProfile = {
  name: "娓告垙鐜╁",
  title: "鐑埍娓告垙鐨勫啋闄╄€?,
  bio: "鐑埍娓告垙鐨勫啋闄╄€咃紝鍠滄鎺㈢储鍚勭绫诲瀷鐨勬父鎴忎笘鐣岋紝璁板綍姣忎竴娆＄簿褰╃殑娓告垙浣撻獙銆?,
  avatar: "/assets/default-avatar.svg",
  tags: ["鍘熺", "鏄庢棩鏂硅垷", "鐜嬭€呰崳鑰€", "闂€€鏆栨殩"],
  joinDate: lastYearMonth(6, 15),
  playStyle: { ...DEFAULT_PLAY_STYLE },
  favoriteGames: [],
};

export function profileAvatarUrl(avatar?: string): string {
  if (!avatar?.trim()) return "/assets/default-avatar.svg";
  if (avatar.startsWith("assets/")) return `/${avatar}`;
  return avatar;
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeProfile(raw: Partial<UserProfile>): UserProfile {
  const merged = { ...DEFAULT_PROFILE, ...raw };
  return {
    ...merged,
    avatar: profileAvatarUrl(merged.avatar),
    tags: Array.isArray(merged.tags) ? merged.tags : [...DEFAULT_PROFILE.tags],
    favoriteGames: Array.isArray(merged.favoriteGames)
      ? merged.favoriteGames
      : [],
    playStyle: {
      ...DEFAULT_PLAY_STYLE,
      ...(merged.playStyle || {}),
    },
  };
}

export function getProfile(): UserProfile {
  if (typeof window === "undefined") return { ...DEFAULT_PROFILE };
  const stored = parseJson<Partial<UserProfile>>(
    localStorage.getItem(STORAGE_KEYS.PROFILE),
    {},
  );
  return normalizeProfile(stored);
}

export function saveProfile(profile: UserProfile): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    return true;
  } catch (e) {
    console.error("[profile] save failed", e);
    return false;
  }
}

export function memberDaysSince(joinDate: string): number {
  const join = new Date(joinDate);
  if (Number.isNaN(join.getTime())) return 0;
  const now = new Date();
  return Math.max(
    0,
    Math.floor((now.getTime() - join.getTime()) / (1000 * 60 * 60 * 24)),
  );
}
