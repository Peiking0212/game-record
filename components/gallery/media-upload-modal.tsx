"use client";

import { UploadCloud } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import type { GameRecord } from "@/lib/game-types";

type Props = {
  open: boolean;
  uploadType: "image" | "video";
  fileCount: number;
  games: GameRecord[];
  gameId: string;
  uploading: boolean;
  onClose: () => void;
  onGameIdChange: (id: string) => void;
  onConfirm: () => void;
};

export function MediaUploadModal({
  open,
  uploadType,
  fileCount,
  games,
  gameId,
  uploading,
  onClose,
  onGameIdChange,
  onConfirm,
}: Props) {
  const typeName = uploadType === "image" ? "图片" : "视频";
  const hasFiles = fileCount > 0;

  return (
    <Modal open={open} onClose={onClose} title="上传素材" maxWidth="md">
      <div className="media-upload-panel">
        <div className="media-upload-summary" aria-live="polite">
          <div>
            <span className="media-upload-kicker">
              {uploadType === "image" ? "截图 / 插画" : "视频 / 片段"}
            </span>
            <p className="media-upload-count">
              {hasFiles ? `已选择 ${fileCount} 个${typeName}` : "还没有选择文件"}
            </p>
          </div>
          <span className="media-upload-badge">{typeName}</span>
        </div>

        <div className="media-upload-field">
          <label className="media-upload-label" htmlFor="media-upload-game">
            关联所属游戏
          </label>
          <select
            id="media-upload-game"
            className="media-upload-select"
            value={gameId}
            onChange={(e) => onGameIdChange(e.target.value)}
          >
            <option value="">不选择</option>
            {games.map((g) => (
              <option key={String(g.id)} value={String(g.id)}>
                {g.name}
              </option>
            ))}
          </select>
          <p className="media-upload-help">
            不确定归属时可以先不选；绑定游戏后会自动进入对应筛选。
          </p>
        </div>

        {!hasFiles && (
          <p className="media-upload-warning">
            请先选择图片或视频文件，再确认上传。
          </p>
        )}

        <button
          type="button"
          className="btn-primary media-upload-submit"
          disabled={uploading || !hasFiles}
          onClick={onConfirm}
        >
          <UploadCloud className="w-5 h-5 mr-2" />
          {uploading ? "上传中…" : `上传素材 ${fileCount} 个${typeName}`}
        </button>
      </div>
    </Modal>
  );
}
