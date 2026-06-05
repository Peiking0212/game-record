"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import type { MediaItem } from "@/lib/media/types";
import { formatDateISO } from "@/lib/game-utils";
import { normalizeMediaType } from "@/lib/media/utils";

type Props = {
  item: MediaItem | null;
  onClose: () => void;
};

export function MediaLightbox({ item, onClose }: Props) {
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [item, onClose]);

  if (!item) return null;

  const type = normalizeMediaType(item);
  const nameText = item.gameName || "未指定游戏";
  const dateText = item.time ? formatDateISO(item.time) : "";
  const typeText = type === "video" ? "视频" : "图片";

  return (
    <div
      id="lightbox"
      className="gallery-lightbox open"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        className="lightbox-close"
        onClick={onClose}
        aria-label="关闭"
      >
        <X className="w-6 h-6" />
      </button>
      <div id="lightbox-content" className="flex flex-col items-center">
        <div id="lightbox-media-container">
          {type === "video" ? (
            <video
              src={item.url}
              controls
              className="max-w-full max-h-[70vh] rounded-lg"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              id="lightbox-image"
              src={item.url}
              alt={nameText}
              className="max-w-full max-h-[70vh] rounded-lg"
            />
          )}
        </div>
        <div id="lightbox-info" className="mt-4 text-white text-center">
          <p className="text-lg font-medium">{nameText}</p>
          <p className="text-sm text-gray-300 mt-1">{typeText}</p>
          {dateText && (
            <p className="text-sm text-gray-300 mt-1">上传于 {dateText}</p>
          )}
        </div>
      </div>
    </div>
  );
}