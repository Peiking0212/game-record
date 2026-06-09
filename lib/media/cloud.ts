import type { SupabaseClient } from "@supabase/supabase-js";
import type { MediaItem } from "@/lib/media/types";
import {
  compressImage,
  dataUrlToBlob,
  generateThumbnail,
  generateVideoCover,
  readFileAsDataUrl,
} from "@/lib/media/process";
import { generateMediaId, normalizeMediaType } from "@/lib/media/utils";
import { migrateRecordGameId } from "@/lib/game-hub";
import type { MediaRecord } from "@/lib/game-data";

const BUCKET = "media";
const TABLE = "media";

export function formatSupabaseError(err: unknown): string {
  if (!err) return "未知错误";
  if (typeof err === "string") return err;
  const e = err as { message?: string; error_description?: string; statusCode?: number };
  let msg = e.message || e.error_description || "";
  if (e.statusCode) msg = `${msg} (${e.statusCode})`.trim();
  return msg || JSON.stringify(err);
}

function storagePathFromPublicUrl(url: string): string | null {
  const markers = [
    `/object/public/${BUCKET}/`,
    `/object/sign/${BUCKET}/`,
  ];
  for (const marker of markers) {
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      return decodeURIComponent(url.slice(idx + marker.length).split("?")[0]);
    }
  }
  return null;
}

function mediaStoragePrefix(userId: string) {
  return `${userId}/media/`;
}

function mapRow(row: Record<string, unknown>): MediaItem {
  const item: MediaItem = {
    id: row.id as string | number,
    type: (row.type as "image" | "video") || "image",
    url: String(row.url || ""),
    name: String(row.name || ""),
    gameName: String(row.game_name || ""),
    time: String(row.created_at || ""),
    thumbnail: (row.thumbnail as string) || null,
  };
  item.type = normalizeMediaType(item);
  return migrateRecordGameId(item as MediaRecord, "gameName") as MediaItem;
}

export async function resolveMediaUserId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function checkMediaCloudHealth(
  supabase: SupabaseClient,
): Promise<{ ok: boolean; reason: string }> {
  try {
    const userId = await resolveMediaUserId(supabase);
    if (!userId) return { ok: false, reason: "未登录，无法使用云端媒体库" };

    const tableCheck = await supabase
      .from(TABLE)
      .select("id")
      .eq("user_id", userId)
      .limit(1);
    if (tableCheck.error) {
      return { ok: false, reason: `数据表media异常：${formatSupabaseError(tableCheck.error)}` };
    }

    const bucketCheck = await supabase.storage.from(BUCKET).list(userId, { limit: 1 });
    if (bucketCheck.error) {
      return { ok: false, reason: `存储桶media异常：${formatSupabaseError(bucketCheck.error)}` };
    }

    return { ok: true, reason: "" };
  } catch (e) {
    return { ok: false, reason: formatSupabaseError(e) };
  }
}

export async function fetchMediaFromCloud(
  supabase: SupabaseClient,
): Promise<MediaItem[]> {
  const userId = await resolveMediaUserId(supabase);
  if (!userId) return [];

  const result = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (result.error) throw result.error;
  return (result.data || []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function uploadFileToCloud(
  supabase: SupabaseClient,
  file: File,
  gameId: string | number | null,
  gameName: string,
  fileType: "image" | "video",
): Promise<void> {
  const userId = await resolveMediaUserId(supabase);
  if (!userId) throw new Error("未登录，无法上传至云端");

  const id = generateMediaId();
  const ext = (file.name.split(".").pop() || (fileType === "video" ? "mp4" : "jpg")).toLowerCase();
  const prefix = mediaStoragePrefix(userId);
  const storagePath = `${prefix}${id}.${ext}`;

  if (fileType === "image") {
    const dataUrl = await readFileAsDataUrl(file);
    const compressed = await compressImage(dataUrl, 1920, 0.9);
    const thumb = await generateThumbnail(compressed);

    const uploadResult = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, dataUrlToBlob(compressed), {
        contentType: "image/jpeg",
        upsert: true,
      });
    if (uploadResult.error) throw uploadResult.error;

    const thumbPath = `${prefix}thumb_${id}.jpg`;
    const thumbUp = await supabase.storage
      .from(BUCKET)
      .upload(thumbPath, dataUrlToBlob(thumb), {
        contentType: "image/jpeg",
        upsert: true,
      });
    if (thumbUp.error) throw thumbUp.error;

    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
    const thumbUrl = supabase.storage.from(BUCKET).getPublicUrl(thumbPath).data.publicUrl;

    const insertResult = await supabase.from(TABLE).insert({
      id,
      type: "image",
      url: publicUrl,
      thumbnail: thumbUrl,
      name: file.name,
      game_name: gameName || "",
      user_id: userId,
    });
    if (insertResult.error) throw insertResult.error;
  } else {
    const videoThumb = await generateVideoCover(file);

    const uploadResult = await supabase.storage.from(BUCKET).upload(storagePath, file, {
      contentType: file.type || "video/mp4",
      upsert: true,
    });
    if (uploadResult.error) throw uploadResult.error;

    const thumbPath = `${prefix}thumb_${id}.jpg`;
    const thumbUp = await supabase.storage
      .from(BUCKET)
      .upload(thumbPath, dataUrlToBlob(videoThumb), {
        contentType: "image/jpeg",
        upsert: true,
      });
    if (thumbUp.error) throw thumbUp.error;

    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
    const thumbUrl = supabase.storage.from(BUCKET).getPublicUrl(thumbPath).data.publicUrl;

    const insertResult = await supabase.from(TABLE).insert({
      id,
      type: "video",
      url: publicUrl,
      thumbnail: thumbUrl,
      name: file.name,
      game_name: gameName || "",
      user_id: userId,
    });
    if (insertResult.error) throw insertResult.error;
  }
}

export async function deleteMediaFromCloud(
  supabase: SupabaseClient,
  id: string | number,
): Promise<void> {
  const userId = await resolveMediaUserId(supabase);
  if (!userId) throw new Error("未登录");

  const rowResult = await supabase
    .from(TABLE)
    .select("url, thumbnail")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (rowResult.error) throw rowResult.error;

  const paths: string[] = [];
  if (rowResult.data) {
    const mainPath = storagePathFromPublicUrl(rowResult.data.url);
    const thumbPath = storagePathFromPublicUrl(rowResult.data.thumbnail || "");
    if (mainPath) paths.push(mainPath);
    if (thumbPath) paths.push(thumbPath);
  }

  await supabase.from(TABLE).delete().eq("id", id).eq("user_id", userId);

  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths);
  }
}

export async function updateEditedImageOnCloud(
  supabase: SupabaseClient,
  mediaId: string | number,
  editedDataUrl: string,
  thumbnailSize: number,
): Promise<void> {
  const userId = await resolveMediaUserId(supabase);
  if (!userId) throw new Error("未登录");

  const prefix = mediaStoragePrefix(userId);
  const storagePath = `${prefix}edited_${generateMediaId()}.jpg`;
  const blob = dataUrlToBlob(editedDataUrl);

  const uploadResult = await supabase.storage.from(BUCKET).upload(storagePath, blob, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (uploadResult.error) throw uploadResult.error;

  const thumb = await generateThumbnail(editedDataUrl, thumbnailSize);
  const thumbPath = `${prefix}thumb_${mediaId}.jpg`;
  await supabase.storage.from(BUCKET).upload(thumbPath, dataUrlToBlob(thumb), {
    contentType: "image/jpeg",
    upsert: true,
  });

  const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
  const thumbUrl = supabase.storage.from(BUCKET).getPublicUrl(thumbPath).data.publicUrl;

  const updateResult = await supabase
    .from(TABLE)
    .update({ url: publicUrl, thumbnail: thumbUrl })
    .eq("id", mediaId)
    .eq("user_id", userId);

  if (updateResult.error) throw updateResult.error;
}