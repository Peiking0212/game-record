"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock, Flame, Gamepad2, Star, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { StoryBeat } from "@/components/ui/story-beat";
import { getHomeStats } from "@/lib/game-data";
import type { GameRecord } from "@/lib/game-types";
import { getStatusText } from "@/lib/game-utils";

export function HomeStats() {
  const [stats, setStats] = useState<ReturnType<typeof getHomeStats> | null>(null);

  useEffect(() => {
    setStats(getHomeStats());
  }, []);

  if (!stats) {
    return (
      <div className="py-20 section-game">
        <StoryBeat variant="hud" tag="loading" play className="max-w-md mx-auto">
          <p className="font-mono text-sm m-0" style={{ color: "var(--text-gray)" }}>
            正在读取游戏库存档槽…
          </p>
        </StoryBeat>
      </div>
    );
  }

  return (
    <>
      <section className="py-20 section-game">
        <div className="container mx-auto px-4">
          <ScrollReveal className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold gradient-text tracking-tight">
              游戏统计概览
            </h2>
            <div className="max-w-lg mx-auto mt-6">
              <StoryBeat variant="hud" chapter="HUD" tag="stats panel" onScroll delay={100}>
                <p className="text-sm md:text-base m-0" style={{ color: "var(--text-dark)" }}>
                  四项读数会像游戏库总览 HUD 一样亮起：总库容量、累计时长、成就与均分，
                  帮你判断这一季主要在刷哪类游戏。
                </p>
              </StoryBeat>
            </div>
          </ScrollReveal>

          <ScrollReveal stagger className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-4">
            <StatCard
              icon={<Gamepad2 className="w-8 h-8" style={{ color: "var(--text-dark)" }} />}
              value={String(stats.totalGames)}
              label="库内游戏"
            />
            <StatCard
              icon={<Clock className="w-8 h-8" style={{ color: "var(--text-dark)" }} />}
              value={`${stats.totalHours}h`}
              label="累计时长"
            />
            <StatCard
              icon={<Trophy className="w-8 h-8" style={{ color: "var(--text-dark)" }} />}
              value={String(stats.totalAchievements)}
              label="解锁成就"
            />
            <StatCard
              icon={<Star className="w-8 h-8" style={{ color: "var(--text-dark)" }} />}
              value={stats.avgRating}
              label="库内均分"
            />
          </ScrollReveal>
        </div>
      </section>

      <section className="py-20 section-game-alt">
        <div className="container mx-auto px-4">
          <ScrollReveal className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              <Flame className="w-8 h-8 inline mr-2" style={{ color: "var(--primary)" }} />
              最近游玩
            </h2>
            <div className="max-w-lg mx-auto mt-6">
              <StoryBeat variant="save" chapter="REC" tag="quick slot" onScroll delay={80}>
                <p className="text-sm md:text-base m-0" style={{ color: "var(--text-dark)" }}>
                  按游玩时长排列的库内快读槽——点开卡片进入详情，继续往背包里补截图与备注。
                </p>
              </StoryBeat>
            </div>
          </ScrollReveal>

          <div className="max-w-6xl mx-auto">
            {stats.recentGames.length === 0 ? (
              <ScrollReveal>
                <div className="text-center py-4 game-surface max-w-md mx-auto p-8">
                  <Gamepad2
                    className="w-16 h-16 mx-auto mb-4"
                    style={{ color: "var(--text-light)" }}
                  />
                  <p style={{ color: "var(--text-gray)" }}>游戏库还是空的</p>
                  <Link
                    href="/games"
                    className="btn-secondary inline-flex items-center mt-4 text-sm"
                  >
                    去游戏库添加第一款
                  </Link>
                </div>
              </ScrollReveal>
            ) : (
              <ScrollReveal stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.recentGames.map((game, i) => (
                  <GameCard key={game.id} game={game} index={i} />
                ))}
              </ScrollReveal>
            )}
            <ScrollReveal className="text-center mt-10">
              <Link href="/games" className="btn-secondary inline-flex items-center">
                查看完整游戏库
              </Link>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="stat-card">
      <div
        className="stat-icon mx-auto mb-4 flex items-center justify-center border"
        style={{
          background: "var(--primary-light)",
          borderColor: "var(--border-ui-emphasis)",
          boxShadow: "var(--shadow-brutal)",
        }}
      >
        {icon}
      </div>
      <div className="stat-number text-3xl md:text-4xl" style={{ color: "var(--text-dark)" }}>
        {value}
      </div>
      <div className="stat-label mt-2">{label}</div>
    </div>
  );
}

function GameCard({ game, index }: { game: GameRecord; index: number }) {
  const hours = parseInt(String(game.playtime), 10) || 0;
  return (
    <Link
      href={`/games/${encodeURIComponent(game.id)}`}
      className="game-surface overflow-hidden block group"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div
        className="h-32 flex items-center justify-center relative border-b"
        style={{
          background: "var(--primary-light)",
          borderColor: "var(--border-light)",
        }}
      >
        {game.icon ? (
          <Image
            src={game.icon}
            alt={game.name}
            width={80}
            height={80}
            className="w-20 h-20 rounded-[var(--radius-card)] object-cover border transition-transform duration-300 group-hover:scale-105"
            style={{ borderColor: "var(--border-ui-emphasis)" }}
            unoptimized
          />
        ) : (
          <Gamepad2 className="w-12 h-12" style={{ color: "var(--text-dark)" }} />
        )}
      </div>
      <div className="p-4">
        <h4 className="font-bold truncate tracking-tight" style={{ color: "var(--text-dark)" }}>
          {game.name}
        </h4>
        <p className="text-sm font-mono mt-1" style={{ color: "var(--text-gray)" }}>
          {game.type || "其他"} · {hours}h
        </p>
        <div className="mt-3">
          <span
            className="text-xs px-3 py-1 rounded-full font-mono border"
            style={{
              background: "var(--primary-light)",
              borderColor: "var(--border-ui)",
              color: "var(--text-dark)",
            }}
          >
            {getStatusText(game.status)}
          </span>
        </div>
      </div>
    </Link>
  );
}
