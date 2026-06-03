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
  const typeName = uploadType === "image" ? "截图" : "视频";

  return (
    <Modal open={open} onClose={onClose} title="确认上传" maxWidth="md">
      <div className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          <span>{typeName}</span>
          <span className="mx-2">·</span>
          <span>{fileCount}</span> 个文件
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            所属游戏（可选）
          </label>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={gameId}
            onChange={(e) => onGameIdChange(e.target.value)}
          >
            <option value="">不指定</option>
            {games.map((g) => (
              <option key={String(g.id)} value={String(g.id)}>
                {g.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            选择文件对应的游戏，方便后续筛选
          </p>
        </div>
        <button
          type="button"
          className="btn-primary w-full inline-flex items-center justify-center"
          disabled={uploading || fileCount === 0}
          onClick={onConfirm}
        >
          <UploadCloud className="w-5 h-5 mr-2" />
          {uploading ? "上传中…" : `确认上传 ${fileCount} 个${typeName}`}
        </button>
      </div>
    </Modal>
  );
}
