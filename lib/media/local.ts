import {
  getMedia,
  resolveGameFieldsFromSelect,
  saveMedia,
  type MediaRecord,
} from "@/lib/game-data";
import {
  buildVideoThumbnail,
  compressImage,
  generateThumbnail,
  readFileAsDataUrl,
} from "@/lib/media/process";
import type { MediaItem } from "@/lib/media/types";
import { generateMediaId } from "@/lib/media/utils";

export function getLocalMedia(): MediaItem[] {
  return getMedia() as MediaItem[];
}

export function saveLocalMedia(items: MediaItem[]): boolean {
  const json = JSON.stringify(items);
  if (json.length > 4 * 1024 * 1024) {
    return false;
  }
  return saveMedia(items as MediaRecord[]);
}

export async function saveMediaLocally(
  file: File,
  gameId: string | number | null,
  gameName: string,
  type: "image" | "video",
): Promise<void> {
  const allMedia = getLocalMedia();
  const resolved = resolveGameFieldsFromSelect(gameId);
  const dataUrl = await readFileAsDataUrl(file);

  const item: MediaItem = {
    id: generateMediaId(),
    type,
    url: dataUrl,
    name: file.name,
    gameId: resolved.gameId ?? null,
    gameName: resolved.gameName || gameName || "",
    time: new Date().toISOString(),
  };

  if (type === "image") {
    item.url = await compressImage(dataUrl, 1920, 0.9);
    item.thumbnail = await generateThumbnail(item.url);
  } else {
    item.thumbnail = await buildVideoThumbnail(file);
  }

  allMedia.push(item);
  if (!saveLocalMedia(allMedia)) {
    throw new Error("存储空间不足");
  }
}

export async function uploadFilesLocally(
  files: File[],
  gameId: string | number | null,
  gameName: string,
  uploadType: "image" | "video",
): Promise<{ loaded: number; errors: number }> {
  const allMedia = getLocalMedia();
  let loaded = 0;
  let errors = 0;
  const resolved = resolveGameFieldsFromSelect(gameId);

  for (const file of files) {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const item: MediaItem = {
        id: generateMediaId(),
        type: uploadType,
        url: dataUrl,
        name: file.name,
        gameId: resolved.gameId ?? null,
        gameName: resolved.gameName || gameName || "",
        time: new Date().toISOString(),
      };
      if (uploadType === "image") {
        item.url = await compressImage(dataUrl, 1920, 0.9);
        item.thumbnail = await generateThumbnail(item.url);
      } else {
        item.thumbnail = await buildVideoThumbnail(file);
      }
      allMedia.push(item);
      loaded++;
    } catch {
      errors++;
    }
  }

  if (loaded > 0 && !saveLocalMedia(allMedia)) {
    throw new Error("存储空间已满");
  }

  return { loaded, errors };
}

export function deleteLocalMedia(id: string | number): void {
  const next = getLocalMedia().filter((item) => String(item.id) !== String(id));
  saveLocalMedia(next);
}

export function updateLocalMediaItem(
  id: string | number,
  patch: Partial<MediaItem>,
): void {
  const all = getLocalMedia();
  const idx = all.findIndex((item) => String(item.id) === String(id));
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...patch };
  saveLocalMedia(all);
}
