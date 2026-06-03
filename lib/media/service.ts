import type { SupabaseClient } from "@supabase/supabase-js";
import { recordBelongsToGame } from "@/lib/game-hub";
import { getGameById, getGames } from "@/lib/game-data";
import type { GameRecord } from "@/lib/game-types";
import { matchGameName } from "@/lib/game-utils";
import { tryCreateClient } from "@/lib/supabase/client";
import {
  checkMediaCloudHealth,
  deleteMediaFromCloud,
  fetchMediaFromCloud,
  formatSupabaseError,
  uploadFileToCloud,
} from "@/lib/media/cloud";
import {
  deleteLocalMedia,
  getLocalMedia,
  saveMediaLocally,
  uploadFilesLocally,
} from "@/lib/media/local";
import type { MediaFilters, MediaItem } from "@/lib/media/types";
import { normalizeMediaType } from "@/lib/media/utils";

export async function getSupabaseForMedia(): Promise<SupabaseClient | null> {
  try {
    const client = tryCreateClient();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data.session ? client : null;
  } catch {
    return null;
  }
}

export async function getAllMedia(): Promise<MediaItem[]> {
  const supabase = await getSupabaseForMedia();
  if (supabase) {
    try {
      return await fetchMediaFromCloud(supabase);
    } catch (e) {
      console.warn("[gallery] cloud fetch failed, using local", e);
    }
  }
  return getLocalMedia();
}

export function filterAndSortMedia(
  allMedia: MediaItem[],
  filters: MediaFilters,
): MediaItem[] {
  let list = allMedia.map((item) => ({
    ...item,
    type: normalizeMediaType(item),
  }));

  const term = filters.search.trim().toLowerCase();
  if (term) {
    list = list.filter((item) =>
      (item.gameName || "").toLowerCase().includes(term),
    );
  }

  if (filters.gameId && filters.gameId !== "all") {
    const game = getGameById(filters.gameId);
    list = list.filter((item) => {
      if (game) return recordBelongsToGame(item, game, "gameName");
      return matchGameName(item.gameName, filters.gameId);
    });
  }

  if (filters.type && filters.type !== "all") {
    list = list.filter((item) => item.type === filters.type);
  }

  list.sort((a, b) => {
    const timeA = a.time ? new Date(a.time).getTime() : 0;
    const timeB = b.time ? new Date(b.time).getTime() : 0;
    return filters.sort === "newest" ? timeB - timeA : timeA - timeB;
  });

  return list;
}

export function getGamesForSelect(): GameRecord[] {
  return [...getGames()].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "zh-CN"),
  );
}

export async function deleteMedia(id: string | number): Promise<void> {
  const supabase = await getSupabaseForMedia();
  if (supabase) {
    try {
      await deleteMediaFromCloud(supabase, id);
      return;
    } catch (e) {
      console.warn("[gallery] cloud delete failed, try local", e);
    }
  }
  deleteLocalMedia(id);
}

export async function uploadMediaBatch(
  files: File[],
  gameId: string | number | null,
  gameName: string,
  uploadType: "image" | "video",
): Promise<{ loaded: number; errors: number; lastError: string }> {
  let loaded = 0;
  let errors = 0;
  let lastError = "";

  const supabase = await getSupabaseForMedia();

  if (supabase) {
    const health = await checkMediaCloudHealth(supabase);
    for (const file of files) {
      try {
        if (health.ok) {
          await uploadFileToCloud(supabase, file, gameId, gameName, uploadType);
        } else {
          await saveMediaLocally(file, gameId, gameName, uploadType);
        }
        loaded++;
      } catch (err) {
        lastError = formatSupabaseError(err);
        try {
          await saveMediaLocally(file, gameId, gameName, uploadType);
          loaded++;
          errors++;
        } catch {
          errors++;
        }
      }
    }
    return { loaded, errors, lastError };
  }

  const result = await uploadFilesLocally(files, gameId, gameName, uploadType);
  return { ...result, lastError: "" };
}
