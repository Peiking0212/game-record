import type { MediaItem } from "@/lib/media/types";

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|bmp|heic|heif|svg)(\?|#|$)/i;
const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|avi|mkv)(\?|#|$)/i;

export function compareMediaId(a: unknown, b: unknown): boolean {
  return String(a) === String(b);
}

export function normalizeMediaType(item: MediaItem): "image" | "video" {
  const t = (item.type || "").toLowerCase();
  const name = (item.name || "").toLowerCase();
  const url = (item.url || "").toLowerCase();
  if (t === "image") return "image";
  if (IMAGE_EXT_RE.test(name) || IMAGE_EXT_RE.test(url)) return "image";
  if (t === "video" || VIDEO_EXT_RE.test(name) || VIDEO_EXT_RE.test(url)) {
    return "video";
  }
  return t === "video" ? "video" : "image";
}

export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return IMAGE_EXT_RE.test(file.name || "");
}

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  return VIDEO_EXT_RE.test(file.name || "");
}

export function generateMediaId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

export const MEDIA_FAIL_PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="#E8F0F8" width="400" height="300"/><text x="200" y="150" text-anchor="middle" dy=".3em" fill="#94A3B8" font-size="16">图片加载失败</text></svg>',
  );

export function videoThumbnailPlaceholder(): string {
  return (
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150"><rect fill="#1a2744" width="150" height="150"/><rect fill="#f0c040" x="55" y="50" width="40" height="40" rx="6"/><polygon fill="#1a2744" points="65,60 85,70 65,80"/></svg>',
    )
  );
}
