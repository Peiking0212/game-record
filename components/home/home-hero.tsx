"use client";

import Link from "next/link";
import { Gamepad2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { StoryBeat } from "@/components/ui/story-beat";

export function HomeHero() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <section className="hero-game py-20 md:py-32 min-h-[min(92vh,920px)] flex items-center" data-hero>
      <div className="hero-grid" aria-hidden />
      <div className="hero-glow hero-glow--a" aria-hidden />
      <div className="hero-glow hero-glow--b" aria-hidden />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <p
            className={`hero-eyebrow font-mono text-sm mb-6 text-center ${ready ? "is-visible" : ""}`}
          >
            /// game_library.sys — 本地存档已挂载
          </p>

          <h1
            className={`hero-title text-4xl md:text-6xl lg:text-[5.5rem] mb-10 text-center ${ready ? "is-visible" : ""}`}
          >
            <span className="sr-only">欢迎来到我的游戏世界</span>
            <span className="hero-title-line block">欢迎来到</span>
            <span className="hero-title-line block hero-title-line--2">我的游戏世界</span>
          </h1>

          <div className="hero-narrative space-y-4 md:space-y-5 max-w-2xl mx-auto">
            <StoryBeat
              variant="save"
              chapter="01"
              tag="save slot"
              play={ready}
              delay={380}
              idleDrift
            >
              <p className="text-base md:text-lg leading-relaxed m-0">
                你的<strong> 游戏库 </strong>就是主存档：每一款入库的游戏各占一个槽位，
                通关、联机、成就都会写进同一条游玩时间线。
              </p>
            </StoryBeat>

            <StoryBeat
              variant="quest"
              chapter="02"
              tag="inventory"
              play={ready}
              delay={720}
              className="md:translate-x-4"
            >
              <p className="text-base md:text-lg leading-relaxed m-0">
                今天只整理背包里一格也行。图标、时长、评分、截图——把战利品归位到
                对应的游戏条目，库面就会越来越整齐。
              </p>
            </StoryBeat>

            <StoryBeat
              variant="hud"
              tag="hud unlock"
              play={ready}
              delay={1060}
              className="md:-translate-x-2"
            >
              <p className="text-base md:text-lg leading-relaxed m-0">
                继续向下滚动，统计读数与最近游玩会像
                <span className="font-mono"> HUD 模块 </span>
                依次点亮，一块一块解锁游戏库总览。
              </p>
            </StoryBeat>
          </div>

          <div
            className={`hero-actions flex flex-wrap justify-center gap-4 mt-12 ${ready ? "is-visible" : ""}`}
            style={{ ["--beat-delay" as string]: "1380ms" }}
          >
            <Link href="/games" className="btn-primary inline-flex items-center">
              <Gamepad2 className="w-5 h-5 mr-2" />
              打开游戏库
            </Link>
            <Link href="/profile" className="btn-secondary inline-flex items-center">
              <User className="w-5 h-5 mr-2" />
              玩家档案
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
