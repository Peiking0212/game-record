"use client";

import Link from "next/link";
import { GameIcon } from "@/components/games/game-icon";
import type { GameRecord } from "@/lib/game-types";
import { gameDetailPath, getStatusText } from "@/lib/game-utils";

type Props = {
  game: GameRecord;
  onEdit: (id: number | string) => void;
};

export function GameCassetteCard({ game, onEdit }: Props) {
  const status = game.status || "playing";
  const href = gameDetailPath(game.id);

  return (
    <div className={`cassette-3d cassette-${status}`}>
      <div className="cassette-3d-inner">
        <Link href={href} className="cassette-3d-front block" title={`查看 ${game.name} 详情页`}>
          <div className="cassette-cover">
            <div className="cassette-ribbon" />
            <GameIcon
              src={game.icon}
              name={game.name}
              className=""
              width={120}
              height={120}
            />
          </div>
          <div className="cassette-label">{game.name}</div>
          <span className="cassette-detail-link">进入详情页→</span>
        </Link>
        <div className="cassette-3d-back">
          <h4>{game.name}</h4>
          <div className="cassette-info-row">
            <span>类型</span>
            <span>{game.type || "其他"}</span>
          </div>
          <div className="cassette-info-row">
            <span>状态</span>
            <span>{getStatusText(game.status)}</span>
          </div>
          <div className="cassette-info-row">
            <span>时长</span>
            <span>{parseInt(String(game.playtime), 10) || 0} 小时</span>
          </div>
          <div className="cassette-info-row">
            <span>进度</span>
            <span>{parseInt(String(game.progress), 10) || 0}%</span>
          </div>
          <div className="cassette-actions">
            <Link className="cassette-btn-play" href={href}>
              详情页
            </Link>
            <button
              type="button"
              className="cassette-btn-edit"
              onClick={() => onEdit(game.id)}
            >
              编辑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}