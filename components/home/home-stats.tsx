"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock, Flame, Gamepad2, Star, Trophy, TrendingUp, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { getGames, getHomeStats } from "@/lib/game-data";
import type { GameRecord } from "@/lib/game-types";
import { getStatusText } from "@/lib/game-utils";

export function HomeStats() {
  const [stats, setStats] = useState<ReturnType<typeof getHomeStats> | null>(null);
  const [games, setGames] = useState<GameRecord[]>([]);

  useEffect(() => {
    setStats(getHomeStats());
    setGames(getGames());
  }, []);

  if (!stats) {
    return (
      <p className="text-center py-12" style={{ color: "var(--text-gray)" }}>
        加载中...
      </p>
    );
  }

  return (
    <>
      {/* ====== 数据统计区域 - 主次分明 ====== */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="glass-card-strong inline-block px-8 py-6 rounded-2xl">
              <h2 className="text-3xl md:text-4xl font-bold gradient-text mb-3">
                我的游戏旅程
              </h2>
              <p className="text-base text-white/90">
                每一款游戏，都是一段独特的冒险
              </p>
            </div>
          </div>

          {/* 主数据卡片 - 大 */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="stat-card stat-card-primary p-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-pink-500">
                  <Clock className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="stat-number text-5xl md:text-6xl">{stats.totalHours}h</div>
              <div className="stat-label text-lg mt-2">累计游戏时长</div>
              <div className="mt-4 flex justify-center gap-2">
                <span className="badge badge-blue">{stats.totalGames} 款游戏</span>
                <span className="badge badge-pink">{stats.avgRating} 平均评分</span>
              </div>
            </div>
          </div>

          {/* 次数据卡片 - 小 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <SubStatCard
              icon={<Gamepad2 className="w-6 h-6 text-blue-500" />}
              value={String(stats.totalGames)}
              label="收藏游戏"
            />
            <SubStatCard
              icon={<Trophy className="w-6 h-6 text-pink-500" />}
              value={String(stats.totalAchievements)}
              label="解锁成就"
            />
            <SubStatCard
              icon={<Star className="w-6 h-6 text-cyan-500" />}
              value={stats.avgRating}
              label="平均评分"
            />
            <SubStatCard
              icon={<TrendingUp className="w-6 h-6 text-emerald-500" />}
              value={stats.totalGames > 0
                ? Math.round((games.filter((g) => g.status === "completed").length / stats.totalGames) * 100) + "%"
                : "0%"}
              label="通关率"
            />
            <SubStatCard
              icon={<Zap className="w-6 h-6 text-amber-500" />}
              value={stats.recentGames.length > 0 ? "活跃" : "休息中"}
              label="当前状态"
            />
            <SubStatCard
              icon={<Flame className="w-6 h-6 text-rose-500" />}
              value={stats.recentGames[0]?.name || "-"}
              label="最爱游戏"
              isText
            />
          </div>
        </div>
      </section>

      {/* ====== 最近游玩 - 游戏封面展示 ====== */}
      <section className="py-20 section-glass">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="glass-card-strong inline-block px-8 py-6 rounded-2xl">
              <h2 className="text-3xl md:text-4xl font-bold gradient-text mb-3">
                最近游玩
              </h2>
              <p className="text-base text-white/90">
                继续你的冒险，重温精彩时刻
              </p>
            </div>
          </div>

          <div className="max-w-6xl mx-auto">
            {stats.recentGames.length === 0 ? (
              <div className="text-center py-12 glass-card max-w-md mx-auto">
                <Gamepad2 className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--text-light)" }} />
                <p className="text-lg font-medium mb-2" style={{ color: "var(--text-dark)" }}>
                  暂无收藏的游戏
                </p>
                <p className="text-sm mb-6" style={{ color: "var(--text-gray)" }}>
                  开始记录你的第一款游戏吧
                </p>
                <Link href="/games" className="btn-primary inline-flex items-center">
                  <Gamepad2 className="w-5 h-5 mr-2" />
                  前往收藏页
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                  {stats.recentGames.map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
                <div className="text-center mt-10">
                  <Link href="/games" className="btn-secondary inline-flex items-center">
                    查看全部游戏
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function SubStatCard({
  icon,
  value,
  label,
  isText = false,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  isText?: boolean;
}) {
  return (
    <div className="glass-card p-5 text-center">
      <div className="flex justify-center mb-3">{icon}</div>
      <div
        className={`font-bold mb-1 ${isText ? "text-base" : "text-2xl"}`}
        style={{ color: "var(--text-dark)" }}
      >
        {value}
      </div>
      <div className="text-xs" style={{ color: "var(--text-gray)" }}>
        {label}
      </div>
    </div>
  );
}

function GameCard({ game }: { game: GameRecord }) {
  const hours = parseInt(String(game.playtime), 10) || 0;
  const progress = parseInt(String(game.progress), 10) || 0;

  return (
    <Link
      href={`/games/${encodeURIComponent(game.id)}`}
      className="game-card game-card-link group"
    >
      {/* 封面 */}
      <div className="game-card-cover">
        <div className="game-card-img-wrapper">
          {game.icon ? (
            <Image
              src={game.icon}
              alt={game.name}
              fill
              className="game-card-img"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-pink-100 flex items-center justify-center">
              <Gamepad2 className="w-12 h-12 text-blue-300" />
            </div>
          )}
        </div>
        <div className="game-card-gradient" />

        {/* 状态标签 */}
        <span className="game-card-status">{getStatusText(game.status)}</span>

        {/* 进度条 */}
        {progress > 0 && (
          <div className="absolute bottom-3 left-3 right-3">
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-pink-400"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 信息 */}
      <div className="game-card-body">
        <h4 className="game-card-title">{game.name}</h4>
        <div className="game-card-meta">
          <span>{game.type || "其他"}</span>
          <span>·</span>
          <span>{hours}h</span>
          {progress > 0 && (
            <>
              <span>·</span>
              <span>{progress}%</span>
            </>
          )}
        </div>
      </div>

      {/* 悬浮遮罩 */}
      <div className="game-card-overlay">
        <div className="game-card-overlay-content">
          <h3 className="game-card-overlay-title">{game.name}</h3>
          <div className="game-card-info">
            <div className="game-card-info-row">
              <span className="game-card-info-label">类型</span>
              <span>{game.type || "其他"}</span>
            </div>
            <div className="game-card-info-row">
              <span className="game-card-info-label">时长</span>
              <span>{hours} 小时</span>
            </div>
            <div className="game-card-info-row">
              <span className="game-card-info-label">进度</span>
              <span>{progress}%</span>
            </div>
            <div className="game-card-info-row">
              <span className="game-card-info-label">状态</span>
              <span>{getStatusText(game.status)}</span>
            </div>
          </div>
          <div className="game-card-actions">
            <span className="game-card-btn game-card-btn-primary">查看详情</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
