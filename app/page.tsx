"use client";

import Link from "next/link";
import { Gamepad2, User, Clock, Trophy, Star, Zap } from "lucide-react";
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
      {/* ====== 二次元动漫风格 Hero ====== */}
      <section className="anime-hero relative py-24 md:py-32" data-hero>
        <div className="container mx-auto px-4 text-center relative z-10">
          {/* 玩家身份标签 */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold text-white/90">Lv.{stats ? Math.floor(parseInt(String(stats.totalHours || "0"), 10) / 50) + 1 : 1} 游戏冒险家</span>
          </div>

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
            <Link href="/games" className="btn-primary inline-flex items-center text-base px-8 py-3">
              <Gamepad2 className="w-5 h-5 mr-2" />
              进入游戏库
            </Link>
            <Link href="/profile" className="btn-secondary inline-flex items-center text-base px-8 py-3">
              <User className="w-5 h-5 mr-2" />
              个人中心
            </Link>
          </div>
        </div>

        {/* 底部渐变过渡 */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--bg-light)] to-transparent" style={{ background: "linear-gradient(to top, var(--bg-light), transparent)" }} />
      </section>

      <HomeStats />
    </>
  );
}

function HeroStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="glass-card px-4 py-4 text-center">
      <div className="flex justify-center mb-2 text-white/80">{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-white/60 mt-1">{label}</div>
    </div>
  );
}
