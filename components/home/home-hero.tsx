"use client";

import Link from "next/link";
import { Gamepad2, Trophy, Clock, Target, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getAchievements, getGames } from "@/lib/game-data";
import { GameIcon } from "@/components/games/game-icon";
import type { GameRecord } from "@/lib/game-types";

export function HomeHero() {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);

  useEffect(() => {
    setGames(getGames());
    setAchievements(getAchievements());
  }, []);

  const stats = useMemo(() => {
    const totalGames = games.length;
    const totalHours = games.reduce(
      (s, g) => s + (parseInt(String(g.playtime), 10) || 0),
      0,
    );
    const completed = games.filter((g) => g.status === "completed").length;
    const completionRate = totalGames > 0
      ? Math.round((completed / totalGames) * 100)
      : 0;
    return { totalGames, totalHours, completionRate, achievements: achievements.length };
  }, [games, achievements]);

  // 取前4个有 icon 的游戏做封面墙
  const coverGames = useMemo(
    () => games.filter((g) => g.icon).slice(0, 4),
    [games],
  );
  // 如果不足4个，补一些无 icon 的
  const coverSlots = useMemo(() => {
    const withIcon = games.filter((g) => g.icon).slice(0, 4);
    if (withIcon.length >= 4) return withIcon;
    const rest = games.filter((g) => !g.icon).slice(0, 4 - withIcon.length);
    return [...withIcon, ...rest];
  }, [games]);

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "#0f172a" }}
      data-hero
    >
      {/* 微妙的纹理底纹 */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 25%, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="container mx-auto px-4 py-20 md:py-28 relative z-10">
        {/* 标题区 */}
        <div className="text-center mb-12">
          <h1
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ color: "#f1f5f9" }}
          >
            游戏时光记录平台
          </h1>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: "#94a3b8" }}>
            记录游戏收藏、游玩时长、年度总结、数据统计与个人图鉴
          </p>
        </div>

        {/* 数据概览 — 4 个指标项 */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile icon={<Gamepad2 className="w-5 h-5" />} value={stats.totalGames} label="游戏收藏" />
            <StatTile icon={<Clock className="w-5 h-5" />} value={stats.totalHours + "h"} label="累计游玩" highlight />
            <StatTile icon={<Target className="w-5 h-5" />} value={stats.completionRate + "%"} label="通关率" />
            <StatTile icon={<Trophy className="w-5 h-5" />} value={stats.achievements} label="解锁成就" />
          </div>
        </div>

        {/* CTA 按钮 */}
        <div className="flex flex-wrap justify-center gap-4 mb-14">
          <Link
            href="/games"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all hover:scale-105"
            style={{ background: "#3b82f6", color: "#fff" }}
          >
            <Gamepad2 className="w-4 h-4" />
            进入游戏库
          </Link>
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all hover:scale-105"
            style={{ background: "rgba(255,255,255,0.1)", color: "#f1f5f9", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <User className="w-4 h-4" />
            个人中心
          </Link>
        </div>

        {/* 封面墙 */}
        {coverSlots.length > 0 && (
          <div className="max-w-xl mx-auto">
            <p className="text-center text-xs mb-3" style={{ color: "#64748b" }}>
              最近游玩的游戏
            </p>
            <div className="grid grid-cols-4 gap-3">
              {coverSlots.map((game) => (
                <Link
                  key={String(game.id)}
                  href={`/games/${encodeURIComponent(String(game.id))}`}
                  className="block rounded-lg overflow-hidden aspect-[3/4] relative group"
                >
                  <GameIcon
                    src={game.icon}
                    name={game.name}
                    width={200}
                    height={280}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(transparent 60%, rgba(15,23,42,0.8))" }} />
                  <span
                    className="absolute bottom-2 left-2 right-2 text-xs font-medium truncate"
                    style={{ color: "#f1f5f9" }}
                  >
                    {game.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function StatTile({
  icon,
  value,
  label,
  highlight,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-4 text-center transition-all hover:-translate-y-0.5"
      style={{
        background: highlight
          ? "linear-gradient(135deg, #1e3a5f, #1e1b4b)"
          : "rgba(255,255,255,0.06)",
        border: highlight
          ? "1px solid rgba(59,130,246,0.3)"
          : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="flex justify-center mb-2"
        style={{ color: highlight ? "#60a5fa" : "#94a3b8" }}
      >
        {icon}
      </div>
      <div
        className="text-2xl font-bold mb-0.5"
        style={{ color: highlight ? "#f1f5f9" : "#e2e8f0" }}
      >
        {value}
      </div>
      <div className="text-xs" style={{ color: "#64748b" }}>
        {label}
      </div>
    </div>
  );
}
