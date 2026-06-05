import type { GameFormValues } from "@/lib/game-types";

const STATUS_LABELS: Record<string, string> = {
  playing: "姝ｅ湪鐜?,
  completed: "宸插畬鎴?,
  paused: "鏆傚仠涓?,
  dropped: "宸叉斁寮?,
  abandoned: "宸叉斁寮?,
  wishlist: "鎰挎湜鍗?,
  planned: "璁″垝涓?,
  backlog: "寰呯帺",
};

export function getStatusText(status?: string): string {
  if (!status) return "-";
  return STATUS_LABELS[status] ?? status;
}

export function defaultGameCover(seed?: string): string {
  const text = String(seed ?? "");
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
  }
  return Math.abs(hash) % 2 === 0
    ? "/assets/default-cover-male.svg"
    : "/assets/default-cover-female.svg";
}

export function gameIconUrl(icon?: string, name?: string): string {
  if (!icon) return defaultGameCover(name);
  if (icon.startsWith("assets/")) return `/${icon}`;
  return icon;
}

export function gameDetailPath(id: number | string): string {
  return `/games/${encodeURIComponent(String(id))}`;
}

export function validateGameForm(values: GameFormValues): string | null {
  const name = values.name.trim();
  if (!name) return "璇疯緭鍏ユ父鎴忓悕绉?;
  if (Number.isNaN(values.playtime) || values.playtime < 0) {
    return "璇疯緭鍏ユ湁鏁堢殑娓告垙鏃堕暱";
  }
  if (
    Number.isNaN(values.progress) ||
    values.progress < 0 ||
    values.progress > 100
  ) {
    return "杩涘害闇€鍦?0鈥?00 涔嬮棿";
  }
  if (!values.status) return "璇烽€夋嫨娓告垙鐘舵€?;
  if (!values.type) return "璇烽€夋嫨娓告垙绫诲瀷";
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
