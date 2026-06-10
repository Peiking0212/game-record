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
  playing: "bg-emerald-500",
  completed: "bg-blue-500",
  paused: "bg-amber-500",
  dropped: "bg-gray-400",
};

const statusLabels: Record<string, string> = {
  playing: "游玩中",
  completed: "已通关",
  paused: "暂停",
  dropped: "弃坑",
};

export function GameCassetteCard({ game, onEdit }: Props) {
  const status = game.status || "playing";
  const href = gameDetailPath(game.id);

  return (
    <div className="game-card group">
      <Link href={href} className="game-card-link">
        <div className="game-card-cover">
          <div className="game-card-img-wrapper">
            <GameIcon
              src={game.icon}
              name={game.name}
              width={200}
              height={200}
              className="game-card-img"
            />
            <div className="game-card-gradient" />
          </div>
          <span className={`game-card-status ${statusColors[status] || "bg-emerald-500"}`}>
            {statusLabels[status] || "游玩中"}
          </span>
        </div>
        <div className="game-card-body">
          <h3 className="game-card-title">{game.name}</h3>
          <div className="game-card-meta">
            <span>{game.type || "其他"}</span>
            <span>·</span>
            <span>{parseInt(String(game.playtime), 10) || 0}h</span>
          </div>
        </div>
      </Link>

      <div className="game-card-overlay">
        <div className="game-card-overlay-content">
          <h4 className="game-card-overlay-title">{game.name}</h4>
          <div className="game-card-info">
            <div className="game-card-info-row">
              <span className="game-card-info-label">类型</span>
              <span>{game.type || "其他"}</span>
            </div>
            <div className="game-card-info-row">
              <span className="game-card-info-label">状态</span>
              <span>{getStatusText(game.status)}</span>
            </div>
            <div className="game-card-info-row">
              <span className="game-card-info-label">时长</span>
              <span>{parseInt(String(game.playtime), 10) || 0} 小时</span>
            </div>
            <div className="game-card-info-row">
              <span className="game-card-info-label">进度</span>
              <span>{parseInt(String(game.progress), 10) || 0}%</span>
            </div>
          </div>
          <div className="game-card-actions">
            <Link className="game-card-btn game-card-btn-primary" href={href}>
              查看详情
            </Link>
            <button
              type="button"
              className="game-card-btn game-card-btn-secondary"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(game.id);
              }}
            >
              编辑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
