"use client";

import Link from "next/link";
import { Clock, Flame, Gamepad2, Star, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getGames } from "@/lib/game-data";
import type { GameRecord } from "@/lib/game-types";
import { getStatusText } from "@/lib/game-utils";
import { GameIcon } from "@/components/games/game-icon";

export function HomeStats() {
  const [games, setGames] = useState<GameRecord[]>([]);

  useEffect(() => {
    setGames(getGames());
  }, []);

  const stats = useMemo(() => {
    const totalHours = games.reduce(
      (s, g) => s + (parseInt(String(g.playtime), 10) || 0),
      0,
    );
    const completed = games.filter((g) => g.status === "completed").length;
    const completionRate = games.length > 0
      ? Math.round((completed / games.length) * 100)
      : 0;
    const achievements = 0; // placeholder - would need achievements count
    const ratings = games
      .filter((g) => (g.progress ?? 0) > 0)
      .map((g) => Math.ceil((g.progress ?? 0) / 20));
    const avgRating =
      ratings.length > 0
        ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
        : "0.0";

    // 最常玩的游戏
    const sortedByPlaytime = [...games].sort(
      (a, b) =>
        (parseInt(String(b.playtime), 10) || 0) -
        (parseInt(String(a.playtime), 10) || 0),
    );
    const favoriteGame = sortedByPlaytime[0] || null;

    return {
      totalGames: games.length,
      totalHours,
      completed,
      completionRate,
      achievements,
      avgRating,
      favoriteGame,
      recentGames: sortedByPlaytime.slice(0, 4),
    };
  }, [games]);

  if (games.length === 0) {
    return (
      <p className="text-center py-12" style={{ color: "var(--text-gray)" }}>
        加载中…
      </p>
    );
  }

  return (
    <>
      {/* ── 深色数据面板 ── */}
      <section style={{ background: "#111827" }} className="py-14">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            {/* 主卡：总时长 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div
                className="md:col-span-2 rounded-2xl p-6 md:p-8 flex items-center gap-6"
                style={{
                  background: "linear-gradient(135deg, #1e3a5f, #1e1b4b)",
                  border: "1px solid rgba(59,130,246,0.2)",
                }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(59,130,246,0.2)" }}
                >
                  <Clock className="w-8 h-8" style={{ color: "#60a5fa" }} />
                </div>
                <div>
                  <div className="text-sm mb-1" style={{ color: "#94a3b8" }}>
                    累计游戏时长
                  </div>
                  <div
                    className="text-4xl md:text-5xl font-bold tracking-tight"
                    style={{ color: "#f1f5f9" }}
                  >
                    {stats.totalHours}
                    <span className="text-lg font-normal ml-1" style={{ color: "#64748b" }}>小时</span>
                  </div>
                </div>
                {stats.favoriteGame && (
                  <div className="ml-auto hidden sm:flex items-center gap-3 shrink-0">
                    <GameIcon
                      src={stats.favoriteGame.icon}
                      name={stats.favoriteGame.name}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div>
                      <div className="text-xs" style={{ color: "#64748b" }}>最常玩</div>
                      <div className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>
                        {stats.favoriteGame.name}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 副卡 1：游戏数 */}
              <div
                className="rounded-2xl p-6 flex flex-col justify-center"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <Gamepad2 className="w-6 h-6 mb-2" style={{ color: "#60a5fa" }} />
                <div className="text-2xl font-bold" style={{ color: "#e2e8f0" }}>
                  {stats.totalGames}
                </div>
                <div className="text-sm" style={{ color: "#64748b" }}>游戏收藏</div>
              </div>
            </div>

            {/* 副卡 2-4 */}
            <div className="grid grid-cols-3 gap-4">
              <MiniStatTile icon={<Trophy className="w-5 h-5" />} value={String(stats.completed)} label="已通关" color="#22c55e" />
              <MiniStatTile icon={<Star className="w-5 h-5" />} value={stats.completionRate + "%"} label="通关率" color="#f59e0b" />
              <MiniStatTile icon={<Flame className="w-5 h-5" />} value={stats.avgRating} label="平均评分" color="#ef4444" />
            </div>
          </div>
        </div>
      </section>

      {/* ── 浅色区：最近游玩 ── */}
      <section className="py-16" style={{ background: "#f8fafc" }}>
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-2" style={{ color: "#1e293b" }}>
            <Flame className="w-6 h-6 inline mr-2" style={{ color: "#f59e0b" }} />
            最近游玩
          </h2>
          <p
            className="text-center mb-8 max-w-xl mx-auto text-sm"
            style={{ color: "#64748b" }}
          >
            展示近期添加与经常游玩的游戏，快速继续你的游戏旅程
          </p>
          <div className="max-w-6xl mx-auto">
            {stats.recentGames.length === 0 ? (
              <div className="text-center py-8">
                <Gamepad2 className="w-16 h-16 mx-auto mb-4" style={{ color: "#cbd5e1" }} />
                <p style={{ color: "#94a3b8" }}>暂无收藏的游戏</p>
                <Link href="/games" className="text-sm hover:underline" style={{ color: "#3b82f6" }}>
                  前往收藏页添加第一款游戏
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.recentGames.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            )}
            <div className="text-center mt-8">
              <Link
                href="/games"
                className="inline-flex items-center px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
                style={{
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #e2e8f0",
                }}
              >
                查看全部游戏 →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function MiniStatTile({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-4 flex items-center gap-3"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ color }}>{icon}</div>
      <div>
        <div className="text-lg font-bold" style={{ color: "#e2e8f0" }}>{value}</div>
        <div className="text-xs" style={{ color: "#64748b" }}>{label}</div>
      </div>
    </div>
  );
}

function GameCard({ game }: { game: GameRecord }) {
  const hours = parseInt(String(game.playtime), 10) || 0;
  return (
    <Link
      href={`/games/${encodeURIComponent(game.id)}`}
      className="block rounded-xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg"
      style={{ background: "#fff", border: "1px solid #e2e8f0" }}
    >
      {/* 封面区 */}
      <div className="aspect-[3/2] relative overflow-hidden">
        <GameIcon
          src={game.icon}
          name={game.name}
          width={400}
          height={280}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(transparent 50%, rgba(0,0,0,0.4))" }}
        />
      </div>
      {/* 信息区 */}
      <div className="p-4">
        <h4 className="font-semibold truncate" style={{ color: "#1e293b" }}>
          {game.name}
        </h4>
        <div className="flex items-center gap-2 mt-1 text-sm" style={{ color: "#64748b" }}>
          <span>{game.type || "其他"}</span>
          <span>·</span>
          <span>{hours}h</span>
        </div>
        <div className="mt-2">
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: "#f1f5f9",
              color: "#475569",
            }}
          >
            {getStatusText(game.status)}
          </span>
        </div>
      </div>
    </Link>
  );
}
