"use client";

import Link from "next/link";
import { GameIcon } from "@/components/games/game-icon";
import type { GameRecord } from "@/lib/game-types";
import { gameDetailPath, getStatusText } from "@/lib/game-utils";

type Props = {
  game: GameRecord;
  onEdit: (id: number | string) => void;
};

const statusColors: Record<string, string> = {
  playing: "#22c55e",
  completed: "#3b82f6",
  paused: "#f59e0b",
  dropped: "#94a3b8",
};

// 从游戏名生成柔和渐变色
function nameGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `linear-gradient(135deg, hsl(${h}, 60%, 40%), hsl(${(h + 60) % 360}, 50%, 30%))`;
}

export function GameCassetteCard({ game, onEdit }: Props) {
  const status = game.status || "playing";
  const href = gameDetailPath(game.id);
  const hours = parseInt(String(game.playtime), 10) || 0;
  const progress = parseInt(String(game.progress), 10) || 0;

  return (
    <div className="group" style={{ perspective: "800px" }}>
      <div
        className="rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <Link href={href} className="block">
          {/* 封面区 - 3:4 竖版 */}
          <div className="relative aspect-[3/4] overflow-hidden">
            {game.icon ? (
              <GameIcon
                src={game.icon}
                name={game.name}
                width={300}
                height={400}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: nameGradient(game.name) }}
              >
                <span
                  className="text-4xl font-bold select-none"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {game.name.charAt(0)}
                </span>
              </div>
            )}
            {/* 渐变遮罩底 */}
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(transparent 50%, rgba(15,23,42,0.7))" }}
            />
            {/* 右上角状态标签 */}
            <span
              className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{
                background: statusColors[status] || "#22c55e",
                color: "#fff",
              }}
            >
              {getStatusText(status)}
            </span>
          </div>

          {/* 信息区 */}
          <div className="p-3.5">
            <h3
              className="font-semibold text-sm truncate"
              style={{ color: "#1e293b" }}
            >
              {game.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs" style={{ color: "#64748b" }}>
                {game.type || "其他"}
              </span>
              <span className="text-[10px]" style={{ color: "#cbd5e1" }}>·</span>
              <span className="text-xs font-medium" style={{ color: "#3b82f6" }}>
                {hours}h
              </span>
            </div>
            {/* 进度条 */}
            {progress > 0 && (
              <div className="mt-2.5 h-1 rounded-full overflow-hidden" style={{ background: "#f1f5f9" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: progress + "%",
                    background: progress >= 100
                      ? "#22c55e"
                      : "linear-gradient(90deg, #3b82f6, #8b5cf6)",
                  }}
                />
              </div>
            )}
          </div>
        </Link>

        {/* 底部编辑按钮 - hover 浮现 */}
        <div className="px-3.5 pb-3.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onEdit(game.id);
            }}
            className="w-full py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: "#f1f5f9",
              color: "#475569",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = "#e2e8f0";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = "#f1f5f9";
            }}
          >
            编辑
          </button>
        </div>
      </div>
    </div>
  );
}
