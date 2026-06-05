import { getAchievements } from "@/lib/achievements";
import { getGames } from "@/lib/game-data";
import type { GameRecord } from "@/lib/game-types";
import { getReviews } from "@/lib/reviews";
import { getSpending, type SpendingItem } from "@/lib/spending";

export type ReportData = {
  year: number;
  games: GameRecord[];
  achievements: Array<{ date?: string }>;
  spending: SpendingItem[];
  totalHours: number;
  totalSpent: number;
  typeCounts: Record<string, number>;
};

function yearFromDate(value?: string): number | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.getFullYear();
}

export function getReportYears(): number[] {
  const years = new Set<number>();
  getGames().forEach((g) => {
    const y = yearFromDate(g.lastPlayed);
    if (y) years.add(y);
  });
  getAchievements().forEach((a) => {
    const y = yearFromDate(a.date);
    if (y) years.add(y);
  });
  getReviews().forEach((r) => {
    const y = yearFromDate(r.date);
    if (y) years.add(y);
  });
  getSpending().forEach((s) => {
    const y = yearFromDate(s.date);
    if (y) years.add(y);
  });
  if (!years.size) years.add(new Date().getFullYear());
  return [...years].sort((a, b) => b - a);
}

export function buildReport(year: number): ReportData {
  const games = getGames().filter((g) => yearFromDate(g.lastPlayed) === year);
  const achievements = getAchievements().filter((a) => yearFromDate(a.date) === year);
  const spending = getSpending().filter((s) => yearFromDate(s.date) === year);

  const totalHours = games.reduce(
    (sum, g) => sum + (parseInt(String(g.playtime), 10) || 0),
    0,
  );
  const totalSpent = spending.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const typeCounts = games.reduce<Record<string, number>>((acc, g) => {
    const type = g.type || "鍏朵粬";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return {
    year,
    games,
    achievements,
    spending,
    totalHours,
    totalSpent,
    typeCounts,
  };
}
