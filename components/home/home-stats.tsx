"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock, Flame, Gamepad2, Star, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { getHomeStats } from "@/lib/game-data";
import type { GameRecord } from "@/lib/game-types";
import { getStatusText } from "@/lib/game-utils";

export function HomeStats() {
  const [stats, setStats] = useState<ReturnType<typeof getHomeStats> | null>(
    null,
  );

  useEffect(() => {
    setStats(getHomeStats());
  }, []);

  if (!stats) {
    return (
      <p className="text-center py-12" style={{ color: "var(--text-gray)" }}>
        鍔犺浇涓€?
      </p>
    );
  }

  return (
    <>
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 gradient-text">
            娓告垙缁熻姒傝
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <StatCard
              icon={<Gamepad2 className="w-8 h-8 text-blue-500" />}
              value={String(stats.totalGames)}
              label="娓告垙鎬绘暟"
            />
            <StatCard
              icon={<Clock className="w-8 h-8 text-cyan-500" />}
              value={`${stats.totalHours}h`}
              label="娓告垙鏃堕暱"
              iconBg="bg-cyan-50"
            />
            <StatCard
              icon={<Trophy className="w-8 h-8 text-green-500" />}
              value={String(stats.totalAchievements)}
              label="鑾峰緱鎴愬氨"
              iconBg="bg-green-100"
            />
            <StatCard
              icon={<Star className="w-8 h-8 text-purple-500" />}
              value={stats.avgRating}
              label="骞冲潎璇勫垎"
              iconBg="bg-purple-100"
            />
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">
            <Flame className="w-8 h-8 inline mr-2 text-cyan-500" />
            鎴戠殑娓告垙
          </h2>
          <p
            className="text-center mb-6 max-w-xl mx-auto"
            style={{ color: "var(--text-gray)" }}
          >
            鎸夋€绘父鐜╂椂闀垮睍绀猴紝鐐瑰嚮杩涘叆娓告垙璇︽儏
          </p>
          <div className="max-w-6xl mx-auto">
            {stats.recentGames.length === 0 ? (
              <div className="text-center py-8">
                <Gamepad2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">杩樻病鏈夋父鎴忚褰?/p>
                <Link href="/games" className="text-blue-500 hover:underline">
                  鍘绘坊鍔犱竴娆炬父鎴忓惂
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.recentGames.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            )}
            <div className="text-center mt-8">
              <Link href="/games" className="btn-secondary inline-flex items-center">
                鏌ョ湅鍏ㄩ儴娓告垙
              </Link>
            </div>
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
  iconBg = "bg-gray-100",
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  iconBg?: string;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${iconBg}`}>{icon}</div>
      <div className="stat-number">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function GameCard({ game }: { game: GameRecord }) {
  const hours = parseInt(String(game.playtime), 10) || 0;
  return (
    <Link
      href={`/games/${encodeURIComponent(game.id)}`}
      className="bg-white rounded-lg shadow-lg overflow-hidden block hover:shadow-xl transition-shadow"
    >
      <div className="h-32 bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center relative">
        {game.icon ? (
          <Image
            src={game.icon}
            alt={game.name}
            width={80}
            height={80}
            className="w-20 h-20 rounded-lg object-cover shadow-md"
            unoptimized
          />
        ) : (
          <Gamepad2 className="w-12 h-12 text-blue-400" />
        )}
      </div>
      <div className="p-4">
        <h4 className="font-semibold text-gray-800 truncate">{game.name}</h4>
        <p className="text-sm text-gray-600">
          {game.type || "鍏朵粬"} 路 {hours} 灏忔椂
        </p>
        <div className="mt-2">
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
            {getStatusText(game.status)}
          </span>
        </div>
      </div>
    </Link>
  );
}
