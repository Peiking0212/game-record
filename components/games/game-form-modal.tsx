"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Save } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { GameIcon } from "@/components/games/game-icon";
import type { GameRecord } from "@/lib/game-types";
import {
  GAME_STATUS_OPTIONS,
  GAME_TYPE_OPTIONS,
  type GameFormValues,
} from "@/lib/game-types";
import { defaultGameCover, validateGameForm } from "@/lib/game-utils";

type Mode = "add" | "edit";

type Props = {
  mode: Mode;
  open: boolean;
  game?: GameRecord | null;
  onClose: () => void;
  onSubmit: (values: GameFormValues, gameId?: number | string) => void;
};

const emptyValues: GameFormValues = {
  name: "",
  icon: "",
  type: "",
  status: "playing",
  progress: 0,
  playtime: 0,
  description: "",
};

export function GameFormModal({ mode, open, game, onClose, onSubmit }: Props) {
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<GameFormValues>(emptyValues);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && game) {
      setValues({
        name: game.name,
        icon: game.icon ?? "",
        type: game.type ?? "",
        status: game.status ?? "playing",
        progress: parseInt(String(game.progress), 10) || 0,
        playtime: parseInt(String(game.playtime), 10) || 0,
        description: game.description ?? "",
      });
    } else {
      setValues(emptyValues);
    }
  }, [open, mode, game]);

  function handleFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) {
      showToast("请选择图片文件", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("图片过大，请选择小于2MB的文件", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = String(ev.target?.result ?? "");
      setValues((v) => ({ ...v, icon: result }));
      showToast("图标上传成功", "success");
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validateGameForm(values);
    if (err) {
      showToast(err, "error");
      return;
    }
    onSubmit(
      {
        ...values,
        name: values.name.trim(),
        icon: values.icon.trim() || defaultGameCover(values.name),
        description: values.description.trim(),
      },
      mode === "edit" ? game?.id : undefined,
    );
    onClose();
  }

  const title = mode === "add" ? "添加新游戏" : "编辑游戏";
  const previewIcon = values.icon || (values.name ? defaultGameCover(values.name) : "");

  return (
    <>
      <Modal open={open} onClose={onClose} title={title}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              游戏名称
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              游戏图标
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入图片 URL"
                value={values.icon}
                onChange={(e) => setValues((v) => ({ ...v, icon: e.target.value }))}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => fileRef.current?.click()}
              >
                上传
              </button>
            </div>
            {previewIcon && (
              <div className="mt-2">
                <GameIcon
                  src={previewIcon}
                  name={values.name || "preview"}
                  width={80}
                  height={80}
                  className="rounded-lg object-cover"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              游戏类型
            </label>
            <select
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={values.type}
              onChange={(e) => setValues((v) => ({ ...v, type: e.target.value }))}
            >
              <option value="">选择类型</option>
              {GAME_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              游戏状态
            </label>
            <select
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={values.status}
              onChange={(e) =>
                setValues((v) => ({ ...v, status: e.target.value }))
              }
            >
              {GAME_STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              完成进度
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={100}
                className="flex-1"
                value={values.progress}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    progress: parseInt(e.target.value, 10),
                  }))
                }
              />
              <span className="text-gray-700 font-medium">{values.progress}%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              游玩时长（小时）
            </label>
            <input
              type="number"
              min={0}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={values.playtime}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  playtime: parseInt(e.target.value, 10) || 0,
                }))
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              游戏描述
            </label>
            <textarea
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="描述一下这款游戏..."
              value={values.description}
              onChange={(e) =>
                setValues((v) => ({ ...v, description: e.target.value }))
              }
            />
          </div>

          <button type="submit" className="btn-primary w-full inline-flex items-center justify-center">
            <Save className="w-5 h-5 mr-2" />
            {mode === "add" ? "添加游戏" : "保存修改"}
          </button>
        </form>
      </Modal>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </>
  );
}