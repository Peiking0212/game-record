"use client";

import Link from "next/link";
import { Gamepad2, User, Clock, Trophy, Star } from "lucide-react";
import { HomeStats } from "@/components/home/home-stats";
import { useEffect, useState } from "react";
import { getHomeStats } from "@/lib/game-data";

export default function HomePage() {
  const [stats, setStats] = useState<ReturnType<typeof getHomeStats> | null>(null);

  useEffect(() => {
    setStats(getHomeStats());
  }, []);

  return (
    <>
      {/* ====== Hero ====== */}
      <section className="relative py-24 md:py-32" data-hero>
        <div className="container mx-auto px-4 text-center relative z-10">
          {/* 主标题 */}
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 text-white drop-shadow-lg">
            游戏时光
            <span className="block mt-2 text-3xl md:text-4xl font-bold text-white/80">
              记录平台
            </span>
          </h1>

          {/* 副标题 */}
          <p className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed">
            记录你的游戏旅程，收藏每一段精彩回忆
          </p>

          {/* 核心数据预览 - 毛玻璃卡片 */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-10">
              <HeroStat icon={<Gamepad2 className="w-5 h-5" />} value={String(stats.totalGames)} label="收藏游戏" />
              <HeroStat icon={<Clock className="w-5 h-5" />} value={stats.totalHours + "h"} label="累计时长" />
              <HeroStat icon={<Trophy className="w-5 h-5" />} value={String(stats.totalAchievements)} label="解锁成就" />
              <HeroStat icon={<Star className="w-5 h-5" />} value={stats.avgRating} label="平均评分" />
            </div>
          )}

          {/* CTA 按钮 */}
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/games"
              className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-lg"
            >
              <Gamepad2 className="w-5 h-5" />
              浏览游戏库
            </Link>
            <Link
              href="/profile"
              className="btn-secondary inline-flex items-center gap-2 px-8 py-3 text-lg"
            >
              <User className="w-5 h-5" />
              个人主页
            </Link>
          </div>
        </div>
      </section>

      {/* ====== 统计数据概览 ====== */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <HomeStats />
        </div>
      </section>
    </>
  );
}

function HeroStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="glass-card p-4 rounded-xl">
      <div className="flex items-center justify-center mb-2" style={{ color: "var(--primary)" }}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-white/60">{label}</div>
    </div>
  );
}
