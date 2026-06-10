import type { GameFormValues } from "@/lib/game-types";

const STATUS_LABELS: Record<string, string> = {
  playing: "正在玩",
  completed: "已通关",
  paused: "暂停中",
  dropped: "已弃坑",
  abandoned: "已弃坑",
  wishlist: "愿望单",
  planned: "计划中",
  backlog: "待玩",
};

export function getStatusText(status?: string): string {
  if (!status) return "-";
  return STATUS_LABELS[status] ?? status;
}

export function defaultGameCover(_seed?: string): string {
  // 透明背景，完全融入页面底色
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'/%3E`;
}

export function gameIconUrl(icon?: string, name?: string): string {
  if (!icon || icon.startsWith("/assets/default-cover-")) return defaultGameCover(name);
  if (icon.startsWith("assets/")) return `/${icon}`;
  return icon;
}

export function gameDetailPath(id: number | string): string {
  return `/games/${encodeURIComponent(String(id))}`;
}

export function validateGameForm(values: GameFormValues): string | null {
  const name = values.name.trim();
  if (!name) return "请输入游戏名称";
  if (Number.isNaN(values.playtime) || values.playtime < 0) {
    return "请输入有效的游戏时长";
  }
  if (
    Number.isNaN(values.progress) ||
    values.progress < 0 ||
    values.progress > 100
  ) {
    return "进度需要在 0~100 之间";
  }
  if (!values.status) return "请选择游戏状态";
  if (!values.type) return "请选择游戏类型";
  return null;
}

export function matchGameName(a?: string, b?: string): boolean {
  return (
    String(a ?? "")
      .trim()
      .toLowerCase() ===
    String(b ?? "")
      .trim()
      .toLowerCase()
  );
}

export function getStatusClass(status?: string): string {
  const map: Record<string, string> = {
    playing: "status-playing",
    completed: "status-completed",
    paused: "status-paused",
    dropped: "status-abandoned",
    abandoned: "status-abandoned",
    wishlist: "status-wishlist",
  };
  return (status && map[status]) || "";
}

export function formatDate(dateString?: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateISO(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return String(dateString);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function safeLucideIcon(name?: string): string {
  const n = String(name || "trophy");
  return /^[a-z0-9-]+$/.test(n) ? n : "trophy";
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}