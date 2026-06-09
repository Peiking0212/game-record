import type { MediaItem } from "@/lib/media/types";

// 图片后缀正则：匹配常见图片格式（忽略大小写、兼容url参数/锚点）
const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|bmp|heic|heif|svg)(\?|#|$)/i;
// 视频后缀正则：匹配常见视频格式
const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|avi|mkv)(\?|#|$)/i;

/**
 * 对比两个媒体ID是否相等（统一转为字符串比较）
 */
export function compareMediaId(a: unknown, b: unknown): boolean {
  return String(a ?? "") === String(b ?? "");
}

/**
 * 标准化媒体类型为 image / video
 * 优先级：item.type > 文件后缀(name/url) > 兜底image
 */
export function normalizeMediaType(item: MediaItem): "image" | "video" {
  const type = (item.type ?? "").toLowerCase();
  const name = (item.name ?? "").toLowerCase();
  const url = (item.url ?? "").toLowerCase();

  // 优先使用自带类型
  if (type === "image") return "image";
  if (type === "video") return "video";

  // 其次通过文件名/URL后缀判断
  if (IMAGE_EXT_RE.test(name) || IMAGE_EXT_RE.test(url)) return "image";
  if (VIDEO_EXT_RE.test(name) || VIDEO_EXT_RE.test(url)) return "video";

  // 无法识别，兜底为图片
  return "image";
}

/**
 * 判断文件是否为图片
 * @param file 原生File对象
 */
export function isImageFile(file: File | null | undefined): boolean {
  if (!file) return false;
  if (file.type.startsWith("image/")) return true;
  return IMAGE_EXT_RE.test(file.name);
}

/**
 * 判断文件是否为视频
 * @param file 原生File对象
 */
export function isVideoFile(file: File | null | undefined): boolean {
  if (!file) return false;
  if (file.type.startsWith("video/")) return true;
  return VIDEO_EXT_RE.test(file.name);
}

/**
 * 生成唯一媒体ID（时间戳+随机字符串，36进制）
 */
export function generateMediaId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).slice(2);
  return `${timestamp}${randomStr}`;
}

/**
 * 图片加载失败占位图（SVG DataURL）
 */
export const MEDIA_FAIL_PLACEHOLDER: string = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect fill="#E8F0F8" width="400" height="300"/>
    <text x="200" y="150" text-anchor="middle" dy=".3em" fill="#94A3B8" font-size="16">图片加载失败</text>
  </svg>`
)}`;

/**
 * 视频缩略图默认占位图（播放图标SVG DataURL）
 */
export function videoThumbnailPlaceholder(): string {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150">
      <rect fill="#1a2744" width="150" height="150"/>
      <rect fill="#f0c040" x="55" y="50" width="40" height="40" rx="6"/>
      <polygon fill="#1a2744" points="65,60 85,70 65,80"/>
    </svg>`
  )}`;
}