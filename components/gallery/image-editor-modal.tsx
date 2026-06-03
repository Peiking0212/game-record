"use client";

import {
  Crop,
  Download,
  Image as ImageIcon,
  RotateCcw,
  Save,
  Settings,
  Sliders,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  getLocalMedia,
  saveLocalMedia,
  updateLocalMediaItem,
} from "@/lib/media/local";
import { generateThumbnail } from "@/lib/media/process";
import { updateEditedImageOnCloud } from "@/lib/media/cloud";
import type { MediaItem } from "@/lib/media/types";
import { getSupabaseForMedia } from "@/lib/media/service";

type FilterName =
  | "none"
  | "grayscale"
  | "sepia"
  | "cool"
  | "warm"
  | "vintage"
  | "vivid"
  | "bright";

const FILTERS: { id: FilterName; title: string; className?: string }[] = [
  { id: "none", title: "原图" },
  { id: "grayscale", title: "黑白", className: "bg-gradient-to-br from-gray-200 to-gray-400" },
  { id: "sepia", title: "复古", className: "bg-gradient-to-br from-yellow-100 to-amber-200" },
  { id: "cool", title: "冷色调", className: "bg-gradient-to-br from-blue-200 to-cyan-300" },
  { id: "warm", title: "暖色调", className: "bg-gradient-to-br from-amber-100 to-orange-200" },
  { id: "vintage", title: "怀旧", className: "bg-gradient-to-br from-pink-200 to-purple-300" },
  { id: "vivid", title: "鲜艳", className: "bg-gradient-to-br from-green-200 to-teal-300" },
  { id: "bright", title: "明亮", className: "bg-gradient-to-br from-gray-300 to-white" },
];

type Props = {
  item: MediaItem | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function ImageEditorModal({ item, open, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageDataRef = useRef<ImageData | null>(null);
  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    filter: "none" as FilterName,
  });
  const [cropMode, setCropMode] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 200, height: 200 });
  const [thumbnailSize, setThumbnailSize] = useState(150);
  const [saving, setSaving] = useState(false);

  const applyFiltersToCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const original = originalImageDataRef.current;
    if (!canvas || !original) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(original, 0, 0);

    let filterString = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) `;
    switch (filters.filter) {
      case "grayscale":
        filterString += "grayscale(100%) ";
        break;
      case "sepia":
        filterString += "sepia(80%) ";
        break;
      case "cool":
        filterString += "hue-rotate(180deg) saturate(120%) ";
        break;
      case "warm":
        filterString += "hue-rotate(-15deg) saturate(110%) ";
        break;
      case "vintage":
        filterString += "sepia(40%) contrast(90%) brightness(95%) ";
        break;
      case "vivid":
        filterString += "saturate(150%) contrast(110%) ";
        break;
      case "bright":
        filterString += "brightness(115%) contrast(105%) ";
        break;
      default:
        break;
    }

    ctx.filter = filterString.trim();
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = "none";
  }, [filters]);

  useEffect(() => {
    if (!open || !item) return;

    setFilters({ brightness: 100, contrast: 100, saturation: 100, filter: "none" });
    setCropMode(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const finishSetup = (img: HTMLImageElement) => {
      const maxWidth = 600;
      const maxHeight = 400;
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (maxHeight / height) * width;
        height = maxHeight;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, width, height);
      try {
        originalImageDataRef.current = ctx.getImageData(0, 0, width, height);
      } catch {
        originalImageDataRef.current = null;
      }
      setCropArea({
        x: Math.max(0, (width - 200) / 2),
        y: Math.max(0, (height - 200) / 2),
        width: 200,
        height: 200,
      });
    };

    fetch(item.url, { mode: "cors" })
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.blob();
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          finishSetup(img);
          URL.revokeObjectURL(objectUrl);
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          const img2 = new Image();
          img2.crossOrigin = "anonymous";
          img2.onload = () => finishSetup(img2);
          img2.onerror = () => showToast("无法加载图片进行编辑", "error");
          img2.src = item.url;
        };
        img.src = objectUrl;
      })
      .catch(() => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => finishSetup(img);
        img.onerror = () => showToast("无法加载图片进行编辑", "error");
        img.src = item.url;
      });
  }, [open, item, showToast]);

  useEffect(() => {
    if (open) applyFiltersToCanvas();
  }, [open, filters, applyFiltersToCanvas]);

  async function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas || !item) return;

    setSaving(true);
    try {
      let editedDataUrl: string;
      if (cropMode) {
        const temp = document.createElement("canvas");
        temp.width = cropArea.width;
        temp.height = cropArea.height;
        const tctx = temp.getContext("2d");
        if (!tctx) throw new Error("Canvas error");
        tctx.drawImage(
          canvas,
          cropArea.x,
          cropArea.y,
          cropArea.width,
          cropArea.height,
          0,
          0,
          cropArea.width,
          cropArea.height,
        );
        editedDataUrl = temp.toDataURL("image/jpeg", 0.9);
      } else {
        editedDataUrl = canvas.toDataURL("image/jpeg", 0.9);
      }

      const supabase = await getSupabaseForMedia();
      if (supabase) {
        await updateEditedImageOnCloud(
          supabase,
          item.id,
          editedDataUrl,
          thumbnailSize,
        );
      } else {
        const thumb = await generateThumbnail(editedDataUrl, thumbnailSize);
        updateLocalMediaItem(item.id, { url: editedDataUrl, thumbnail: thumb });
        saveLocalMedia(getLocalMedia());
      }

      showToast("图片编辑保存成功", "success");
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      showToast("保存失败，请重试", "error");
    } finally {
      setSaving(false);
    }
  }

  function resetImage() {
    setFilters({ brightness: 100, contrast: 100, saturation: 100, filter: "none" });
  }

  if (!open || !item) return null;

  return (
    <Modal open={open} onClose={onClose} title="图片编辑器" maxWidth="xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div
            className="relative bg-gray-100 rounded-lg overflow-hidden"
            id="editor-canvas-container"
          >
            <canvas ref={canvasRef} id="editor-canvas" />
            {cropMode && (
              <div id="crop-overlay" className="absolute inset-0">
                <div
                  className="absolute border-2 border-blue-500 bg-blue-500/10"
                  style={{
                    left: cropArea.x,
                    top: cropArea.y,
                    width: cropArea.width,
                    height: cropArea.height,
                  }}
                />
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-center gap-4">
            <button
              type="button"
              className="btn-secondary inline-flex items-center"
              onClick={() => setCropMode((v) => !v)}
            >
              <Crop className="w-4 h-4 mr-2" />
              裁剪模式
            </button>
            <button
              type="button"
              className="btn-secondary inline-flex items-center"
              onClick={resetImage}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              重置
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Sliders className="w-4 h-4 mr-2" />
              滤镜效果
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  title={f.title}
                  className={`filter-item w-12 h-12 rounded-lg border-2 flex items-center justify-center ${
                    filters.filter === f.id
                      ? "border-blue-500 active"
                      : "border-transparent"
                  } ${f.className || ""}`}
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, filter: f.id }))
                  }
                >
                  {f.id === "none" && (
                    <ImageIcon className="w-6 h-6 text-gray-600" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              调整参数
            </h4>
            <div className="space-y-4">
              <div>
                <label className="flex justify-between text-sm text-gray-600">
                  <span>亮度</span>
                  <span>{filters.brightness}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={filters.brightness}
                  className="w-full"
                  onChange={(e) =>
                    setFilters((p) => ({
                      ...p,
                      brightness: parseInt(e.target.value, 10),
                    }))
                  }
                />
              </div>
              <div>
                <label className="flex justify-between text-sm text-gray-600">
                  <span>对比度</span>
                  <span>{filters.contrast}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={filters.contrast}
                  className="w-full"
                  onChange={(e) =>
                    setFilters((p) => ({
                      ...p,
                      contrast: parseInt(e.target.value, 10),
                    }))
                  }
                />
              </div>
              <div>
                <label className="flex justify-between text-sm text-gray-600">
                  <span>饱和度</span>
                  <span>{filters.saturation}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={filters.saturation}
                  className="w-full"
                  onChange={(e) =>
                    setFilters((p) => ({
                      ...p,
                      saturation: parseInt(e.target.value, 10),
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Download className="w-4 h-4 mr-2" />
              导出设置
            </h4>
            <select
              id="thumbnail-size"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
              value={thumbnailSize}
              onChange={(e) => setThumbnailSize(parseInt(e.target.value, 10))}
            >
              <option value={150}>150 x 150</option>
              <option value={200}>200 x 200</option>
              <option value={300}>300 x 300</option>
              <option value={400}>400 x 400</option>
            </select>
            <button
              type="button"
              className="btn-primary w-full inline-flex items-center justify-center"
              disabled={saving}
              onClick={handleSave}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "保存中…" : "保存修改"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
