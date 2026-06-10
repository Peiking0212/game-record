"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const STORAGE_KEY = "game_record_theme";
const HERO_VIDEO_CLASS = "hero-video-bg";

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return "light";
    const parsed = JSON.parse(raw) as { theme?: Theme };
    return parsed.theme === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function writeStoredTheme(theme: Theme) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const base = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...base, theme }));
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme }));
  }
}

function getAutoTimeBackground(): string {
  const now = new Date();
  const hour = now.getHours();
  const month = now.getMonth();

  let seasonHue = 210;
  if (month >= 2 && month <= 4) seasonHue = 120;
  else if (month >= 5 && month <= 7) seasonHue = 30;
  else if (month >= 8 && month <= 10) seasonHue = 25;
  else seasonHue = 230;

  let lightness = 92;
  if (hour >= 6 && hour < 10) lightness = 92;
  else if (hour >= 10 && hour < 15) lightness = 95;
  else if (hour >= 15 && hour < 18) lightness = 88;
  else if (hour >= 18 && hour < 20) lightness = 75;
  else lightness = 20;

  const c1 = "hsl(" + seasonHue + ", 60%, " + lightness + "%)";
  const c2 = "hsl(" + (seasonHue + 30) + ", 50%, " + Math.max(lightness - 15, 15) + "%)";
  return "linear-gradient(135deg, " + c1 + ", " + c2 + ")";
}

function isGradientValue(v: string): boolean {
  const t = v.trim().toLowerCase();
  return (
    t.startsWith("linear-gradient") ||
    t.startsWith("radial-gradient") ||
    t.startsWith("conic-gradient")
  );
}

function isColorValue(v: string): boolean {
  if (!v) return false;
  const t = v.trim();
  if (/^#([0-9a-f]{3}){1,2}$/i.test(t)) return true;
  if (/^(rgb|hsl)a?\s*\(/i.test(t)) return true;
  if (/^[a-z]+$/i.test(t)) return true;
  return false;
}

function isImageUrl(v: string): boolean {
  if (!v) return false;
  const t = v.trim();
  if (/^https?:\/\//i.test(t)) return true;
  if (/\.(jpg|jpeg|png|gif|webp|svg|avif)(\?|$)/i.test(t)) return true;
  return !isColorValue(t) && !isGradientValue(t);
}

function hourIsDark(): boolean {
  const hour = new Date().getHours();
  return hour < 6 || hour >= 18;
}

function clearHeroDecorations(el: HTMLElement) {
  const items = el.querySelectorAll("." + HERO_VIDEO_CLASS);
  items.forEach((item) => (item as HTMLElement).remove());
  el.style.background = "";
  el.style.backgroundImage = "";
  el.style.backgroundSize = "";
  el.style.backgroundPosition = "";
  el.style.color = "";
  el.style.position = "";
  el.style.overflow = "";
  const children = Array.from(el.children);
  children.forEach((child) => {
    if (!(child as HTMLElement).classList.contains(HERO_VIDEO_CLASS)) {
      (child as HTMLElement).style.position = "";
      (child as HTMLElement).style.zIndex = "";
    }
  });
}

function createVideoBackground(el: HTMLElement, videoUrl: string) {
  el.style.position = "relative";
  el.style.overflow = "hidden";
  el.style.color = "#fff";

  const videoEl = document.createElement("video");
  videoEl.className = HERO_VIDEO_CLASS;
  videoEl.autoplay = true;
  videoEl.muted = true;
  videoEl.loop = true;
  videoEl.playsInline = true;
  videoEl.src = videoUrl;
  videoEl.style.cssText =
    "position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;";
  el.insertBefore(videoEl, el.firstChild);

  const overlay = document.createElement("div");
  overlay.className = HERO_VIDEO_CLASS;
  overlay.style.cssText =
    "position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.55);z-index:1;";
  el.insertBefore(overlay, videoEl.nextSibling);

  const children = Array.from(el.children);
  children.forEach((c) => {
    if (!(c as HTMLElement).classList.contains(HERO_VIDEO_CLASS)) {
      (c as HTMLElement).style.position = "relative";
      (c as HTMLElement).style.zIndex = "2";
    }
  });
}

function applyBackground() {
  if (typeof window === "undefined") return;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const heroBg: string = parsed.heroBg || "";
    const autoTimeBg: boolean =
      localStorage.getItem("auto_time_bg") === "true";
    const videoBg: string = localStorage.getItem("site_video_bg") || "";

    const heroSections = document.querySelectorAll<HTMLElement>("[data-hero]");

    heroSections.forEach((el) => {
      clearHeroDecorations(el);

      if (videoBg) {
        createVideoBackground(el, videoBg);
      } else if (autoTimeBg) {
        el.style.background = getAutoTimeBackground();
        el.style.color = hourIsDark() ? "#fff" : "inherit";
      } else if (heroBg) {
        const trimmed = heroBg.trim();
        if (isGradientValue(trimmed)) {
          el.style.background = trimmed;
          el.style.color = "#fff";
        } else if (isColorValue(trimmed)) {
          el.style.background = trimmed;
          el.style.color = "#fff";
        } else if (isImageUrl(trimmed)) {
          el.style.background =
            "linear-gradient(rgba(15,23,42,0.35), rgba(15,23,42,0.55)), url(" +
            trimmed +
            ")";
          el.style.backgroundSize = "cover";
          el.style.backgroundPosition = "center";
          el.style.color = "#fff";
        } else {
          el.style.background = trimmed;
          el.style.color = "#fff";
        }
      }
    });
  } catch {
    // 忽略错误
  }
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    document.documentElement.setAttribute("data-theme", stored);
    applyBackground();

    const onStorage = (e: StorageEvent) => {
      if (
        e.key === STORAGE_KEY ||
        e.key === "auto_time_bg" ||
        e.key === "site_video_bg"
      ) {
        applyBackground();
      }
    };
    window.addEventListener("storage", onStorage);

    const timer = setInterval(() => {
      applyBackground();
    }, 60 * 1000);

    setMounted(true);

    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(timer);
    };
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.documentElement.setAttribute("data-theme", next);
    writeStoredTheme(next);
    applyBackground();
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      <div style={{ visibility: mounted ? "visible" : "hidden" }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

export function refreshBackground() {
  applyBackground();
}
