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
        <Link href={href} className="cassette-3d-front block" title={`鏌ョ湅 ${game.name} 璇︽儏椤礰}>
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
          <span className="cassette-detail-link">杩涘叆璇︽儏椤?鈥?/span>
        </Link>
        <div className="cassette-3d-back">
          <h4>{game.name}</h4>
          <div className="cassette-info-row">
            <span>绫诲瀷</span>
            <span>{game.type || "鍏朵粬"}</span>
          </div>
          <div className="cassette-info-row">
            <span>鐘舵€?/span>
            <span>{getStatusText(game.status)}</span>
          </div>
          <div className="cassette-info-row">
            <span>鏃堕暱</span>
            <span>{parseInt(String(game.playtime), 10) || 0} 灏忔椂</span>
          </div>
          <div className="cassette-info-row">
            <span>杩涘害</span>
            <span>{parseInt(String(game.progress), 10) || 0}%</span>
          </div>
          <div className="cassette-actions">
            <Link className="cassette-btn-play" href={href}>
              璇︽儏椤?
            </Link>
            <button
              type="button"
              className="cassette-btn-edit"
              onClick={() => onEdit(game.id)}
            >
              缂?杈?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
