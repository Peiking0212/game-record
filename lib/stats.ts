import { getAchievements, getGames, type AchievementRecord } from "@/lib/game-data";
import type { GameRecord } from "@/lib/game-types";

export type StatsFilters = {
  year: string;
  type: string;
  status: string;
};

export type StatsOverview = {
  totalGames: number;
  totalPlaytime: number;
  completed: number;
  achievements: number;
};

export function getAllGames(): GameRecord[] {
  return getGames();
}

export function getAllAchievements(): AchievementRecord[] {
  return getAchievements();
}

export function getYearsFromGames(games: GameRecord[]): string[] {
  const years = new Set<string>();
  const current = String(new Date().getFullYear());
  years.add(current);
  for (const g of games) {
    const d = new Date(g.lastPlayed || "");
    if (!Number.isNaN(d.getTime())) years.add(String(d.getFullYear()));
  }
  return [...years].sort((a, b) => Number(b) - Number(a));
}

export function filterGames(games: GameRecord[], filters: StatsFilters): GameRecord[] {
  return games.filter((g) => {
    if (filters.year !== "all") {
      const d = new Date(g.lastPlayed || "");
      if (Number.isNaN(d.getTime()) || String(d.getFullYear()) !== filters.year) {
        return false;
      }
    }
    if (filters.type !== "all" && (g.type || "") !== filters.type) return false;
    if (filters.status !== "all" && (g.status || "") !== filters.status) return false;
    return true;
  });
}

export function buildOverview(
  filteredGames: GameRecord[],
  achievements: AchievementRecord[],
): StatsOverview {
  return {
    totalGames: filteredGames.length,
    totalPlaytime: filteredGames.reduce(
      (sum, g) => sum + (parseInt(String(g.playtime), 10) || 0),
      0,
    ),
    completed: filteredGames.filter((g) => g.status === "completed").length,
    achievements: achievements.length,
  };
}

export function getGameTypes(games: GameRecord[]): string[] {
  return [...new Set(games.map((g) => g.type || "鍏朵粬"))].sort((a, b) =>
    a.localeCompare(b, "zh-CN"),
  );
}

export function yearlySummary(
  year: number,
  games: GameRecord[],
  achievements: AchievementRecord[],
) {
  const yearGames = games.filter((g) => {
    const d = new Date(g.lastPlayed || "");
    return !Number.isNaN(d.getTime()) && d.getFullYear() === year;
  });
  const yearAchievements = achievements.filter((a) => {
    const d = new Date(a.date || "");
    return !Number.isNaN(d.getTime()) && d.getFullYear() === year;
  });
  const topGames = [...yearGames]
    .sort(
      (a, b) =>
        (parseInt(String(b.playtime), 10) || 0) -
        (parseInt(String(a.playtime), 10) || 0),
    )
    .slice(0, 3);
  const typeCountMap = yearGames.reduce<Record<string, number>>((acc, g) => {
    const type = g.type || "鍏朵粬";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  const typeCounts = Object.entries(typeCountMap).sort((a, b) => b[1] - a[1]);

  return {
    year,
    games: yearGames.length,
    hours: yearGames.reduce(
      (sum, g) => sum + (parseInt(String(g.playtime), 10) || 0),
      0,
    ),
    completed: yearGames.filter((g) => g.status === "completed").length,
    achievements: yearAchievements.length,
    topGames,
    typeCounts,
  };
}
