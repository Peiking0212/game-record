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
  const typeName = uploadType === "image" ? "鎴浘" : "瑙嗛";

  return (
    <Modal open={open} onClose={onClose} title="纭涓婁紶" maxWidth="md">
      <div className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          <span>{typeName}</span>
          <span className="mx-2">路</span>
          <span>{fileCount}</span> 涓枃浠?
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            鎵€灞炴父鎴忥紙鍙€夛級
          </label>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={gameId}
            onChange={(e) => onGameIdChange(e.target.value)}
          >
            <option value="">涓嶆寚瀹?/option>
            {games.map((g) => (
              <option key={String(g.id)} value={String(g.id)}>
                {g.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            閫夋嫨鏂囦欢瀵瑰簲鐨勬父鎴忥紝鏂逛究鍚庣画绛涢€?
          </p>
        </div>
        <button
          type="button"
          className="btn-primary w-full inline-flex items-center justify-center"
          disabled={uploading || fileCount === 0}
          onClick={onConfirm}
        >
          <UploadCloud className="w-5 h-5 mr-2" />
          {uploading ? "涓婁紶涓€? : `纭涓婁紶 ${fileCount} 涓?{typeName}`}
        </button>
      </div>
    </Modal>
  );
}
