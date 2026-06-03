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

const ThemeContext = createContext<ThemeContextValue | null>(null);

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
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...base, theme }),
    );
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme }));
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    document.documentElement.setAttribute("data-theme", stored);
    setMounted(true);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.documentElement.setAttribute("data-theme", next);
    writeStoredTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
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
