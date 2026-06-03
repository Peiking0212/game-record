"use client";

import {
  Calendar,
  Camera,
  Edit,
  Eye,
  Filter,
  Image as ImageIcon,
  Play,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImageEditorModal } from "@/components/gallery/image-editor-modal";
import { MediaLightbox } from "@/components/gallery/media-lightbox";
import { MediaUploadModal } from "@/components/gallery/media-upload-modal";
import { useToast } from "@/components/ui/toast";
import { resolveGameFieldsFromSelect } from "@/lib/game-data";
import { formatDateISO } from "@/lib/game-utils";
import { checkMediaCloudHealth } from "@/lib/media/cloud";
import type { MediaFilters, MediaItem } from "@/lib/media/types";
import { isImageFile, isVideoFile, MEDIA_FAIL_PLACEHOLDER, normalizeMediaType } from "@/lib/media/utils";
import {
  deleteMedia,
  filterAndSortMedia,
  getAllMedia,
  getGamesForSelect,
  getSupabaseForMedia,
  uploadMediaBatch,
} from "@/lib/media/service";

export function GalleryClient() {
  const { showToast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [ready, setReady] = useState(false);
  const [allMedia, setAllMedia] = useState<MediaItem[]>([]);
  const [filters, setFilters] = useState<MediaFilters>({
    search: "",
    gameId: "all",
    type: "all",
    sort: "newest",
  });

  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingType, setPendingType] = useState<"image" | "video">("image");
  const [uploadGameId, setUploadGameId] = useState("");
  const [uploading, setUploading] = useState(false);

  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);
  const [editorItem, setEditorItem] = useState<MediaItem | null>(null);

  const games = getGamesForSelect();
  const filtered = filterAndSortMedia(allMedia, filters);

  const loadGallery = useCallback(async () => {
    const media = await getAllMedia();
    setAllMedia(media);
    setReady(true);
  }, []);

  useEffect(() => {
    async function init() {
      const supabase = await getSupabaseForMedia();
      if (supabase) {
        const health = await checkMediaCloudHealth(supabase);
        if (!health.ok) {
          showToast(`媒体库云端异常：${health.reason}`, "error");
        }
      }
      await loadGallery();
    }
    init();
  }, [loadGallery, showToast]);

  function handleImagePick(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).filter(isImageFile);
    if (!list.length) {
      showToast("请选择图片文件", "error");
      return;
    }
    setPendingFiles(list);
    setPendingType("image");
    setUploadGameId("");
    setUploadOpen(true);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function handleVideoPick(files: FileList | null) {
    if (!files?.length) return;
    const valid = Array.from(files).filter(isVideoFile).filter((f) => {
      if (f.size > 50 * 1024 * 1024) {
        showToast(`${f.name} 太大，已跳过（最大 50MB）`, "error");
        return false;
      }
      return true;
    });
    if (!valid.length) return;
    setPendingFiles(valid);
    setPendingType("video");
    setUploadGameId("");
    setUploadOpen(true);
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  async function confirmUpload() {
    if (!pendingFiles.length) {
      showToast("没有选择文件", "error");
      return;
    }
    const resolved = resolveGameFieldsFromSelect(uploadGameId || null);
    setUploading(true);
    try {
      const { loaded, errors, lastError } = await uploadMediaBatch(
        pendingFiles,
        resolved.gameId,
        resolved.gameName,
        pendingType,
      );
      const typeName = pendingType === "image" ? "截图" : "视频";
      if (loaded > 0) {
        showToast(`成功上传 ${loaded} 个${typeName}`, "success");
      }
      if (errors > 0) {
        showToast(
          `${errors} 个文件云端失败，已尝试存本机${lastError ? `。原因：${lastError}` : ""}`,
          "error",
        );
      }
      setUploadOpen(false);
      setPendingFiles([]);
      await loadGallery();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "上传失败", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string | number) {
    if (!confirm("确定要删除这个媒体文件吗？")) return;
    await deleteMedia(id);
    showToast("媒体已删除", "success");
    await loadGallery();
  }

  if (!ready) {
    return (
      <p className="text-center py-24" style={{ color: "var(--text-gray)" }}>
        加载中…
      </p>
    );
  }

  return (
    <>
      <section className="py-20" style={{ background: "var(--primary-light)" }} data-hero>
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-[#223344] to-[#5B9BD5] bg-clip-text text-transparent">
            游戏媒体库
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            记录每一个精彩瞬间
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              type="button"
              data-testid="gallery-upload-image"
              className="btn-primary inline-flex items-center"
              onClick={() => imageInputRef.current?.click()}
            >
              <UploadCloud className="w-5 h-5 mr-2" />
              上传截图
            </button>
            <button
              type="button"
              className="btn-primary inline-flex items-center"
              onClick={() => videoInputRef.current?.click()}
            >
              <Video className="w-5 h-5 mr-2" />
              上传视频
            </button>
          </div>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleImagePick(e.target.files)}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={(e) => handleVideoPick(e.target.files)}
          />
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <ImageIcon className="w-6 h-6 text-blue-500" />
                <span className="text-lg font-semibold text-gray-800">媒体总数</span>
                <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-bold">
                  {filtered.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary text-sm !px-4 !py-2 inline-flex items-center"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  上传截图
                </button>
                <button
                  type="button"
                  className="btn-primary text-sm !px-4 !py-2 inline-flex items-center"
                  onClick={() => videoInputRef.current?.click()}
                >
                  <Video className="w-4 h-4 mr-1" />
                  上传视频
                </button>
              </div>
            </div>

            <div className="filter-bar">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索游戏名称..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, search: e.target.value }))
                  }
                />
              </div>
              <div className="relative min-w-[140px]">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filters.gameId}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, gameId: e.target.value }))
                  }
                >
                  <option value="all">全部游戏</option>
                  {games.map((g) => (
                    <option key={String(g.id)} value={String(g.id)}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative min-w-[140px]">
                <ImageIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filters.type}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, type: e.target.value }))
                  }
                >
                  <option value="all">全部类型</option>
                  <option value="image">图片</option>
                  <option value="video">视频</option>
                </select>
              </div>
              <div className="relative min-w-[140px]">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filters.sort}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      sort: e.target.value as MediaFilters["sort"],
                    }))
                  }
                >
                  <option value="newest">最新上传</option>
                  <option value="oldest">最早上传</option>
                </select>
              </div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto">
            {filtered.length === 0 ? (
              <div className="empty-state">
                <Camera className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-700 mb-4">还没有媒体</h3>
                <p className="text-gray-600 mb-8">
                  上传你的游戏截图或视频，打造专属的视觉记忆库
                </p>
                <button
                  type="button"
                  className="btn-primary inline-flex items-center"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <UploadCloud className="w-5 h-5 mr-2" />
                  上传第一张截图
                </button>
              </div>
            ) : (
              <div id="gallery-grid" className="gallery-grid">
                {filtered.map((item) => {
                  const type = normalizeMediaType(item);
                  const thumb = item.thumbnail || item.url;
                  const displayDate = item.time ? formatDateISO(item.time) : "";

                  return (
                    <div
                      key={String(item.id)}
                      className="gallery-item"
                      onClick={() => setLightboxItem(item)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setLightboxItem(item);
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumb}
                        alt={item.gameName || "媒体"}
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = MEDIA_FAIL_PLACEHOLDER;
                        }}
                      />
                      {type === "video" && (
                        <div className="absolute top-2 right-2 bg-purple-500 text-white p-1 rounded">
                          <Video className="w-4 h-4" />
                        </div>
                      )}
                      <div
                        className="gallery-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="gallery-btn"
                          title={type === "video" ? "播放" : "查看"}
                          onClick={() => setLightboxItem(item)}
                        >
                          {type === "video" ? (
                            <Play className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        {type === "image" && (
                          <button
                            type="button"
                            className="gallery-btn"
                            title="编辑"
                            onClick={() => setEditorItem(item)}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          className="gallery-btn gallery-btn-danger"
                          title="删除"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="gallery-overlay">
                        {item.gameName && (
                          <span className="text-sm font-medium">{item.gameName}</span>
                        )}
                        {displayDate && (
                          <span className="text-xs opacity-80 block mt-1">
                            {displayDate}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <MediaUploadModal
        open={uploadOpen}
        uploadType={pendingType}
        fileCount={pendingFiles.length}
        games={games}
        gameId={uploadGameId}
        uploading={uploading}
        onClose={() => {
          if (!uploading) {
            setUploadOpen(false);
            setPendingFiles([]);
          }
        }}
        onGameIdChange={setUploadGameId}
        onConfirm={confirmUpload}
      />

      <MediaLightbox
        item={lightboxItem}
        onClose={() => setLightboxItem(null)}
      />

      <ImageEditorModal
        item={editorItem}
        open={!!editorItem}
        onClose={() => setEditorItem(null)}
        onSaved={loadGallery}
      />
    </>
  );
}
