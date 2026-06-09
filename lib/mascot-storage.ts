export const MASCOT_LAST_ALERT_KEY = "mascot_last_alert_event_id";

const DEFAULT_QUOTES = [
  "欢迎回来！今天玩什么游戏呀？",
  "记得休息一下哦~",
  "新游戏发售啦，快去看看！",
  "你的游戏收藏又变多啦~",
  "打游戏虽好，可不要熬夜哦！",
  "今天也是元气满满的一天！",
];

export function isMascotEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("mascot_enabled") !== "false";
}

export function setMascotEnabled(enabled: boolean): void {
  localStorage.setItem("mascot_enabled", enabled ? "true" : "false");
}

export function getMascotQuotes(): string[] {
  if (typeof window === "undefined") return DEFAULT_QUOTES;
  try {
    const raw = localStorage.getItem("mascot_quotes");
    if (!raw) return DEFAULT_QUOTES;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_QUOTES;
    const lines = parsed
      .map((x) => String(x).trim())
      .filter((x) => x.length > 0);
    return lines.length > 0 ? lines : DEFAULT_QUOTES;
  } catch {
    return DEFAULT_QUOTES;
  }
}

export function getMascotImage(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("mascot_image");
}

export function setMascotImage(dataUrl: string): void {
  localStorage.setItem("mascot_image", dataUrl);
}

export function getMascotLastAlertEventId(): number {
  if (typeof window === "undefined") return 0;
  const n = parseInt(localStorage.getItem(MASCOT_LAST_ALERT_KEY) || "0", 10);
  return Number.isFinite(n) ? n : 0;
}

export function setMascotLastAlertEventId(id: number): void {
  try {
    localStorage.setItem(MASCOT_LAST_ALERT_KEY, String(id));
  } catch {
    /* ignore quota */
  }
}

export function pickRandomQuote(quotes: string[]): string {
  return quotes[Math.floor(Math.random() * quotes.length)] ?? "说点什么吧~";
}

export const MASCOT_DEFAULT_IMAGE = "/assets/default-avatar.svg";