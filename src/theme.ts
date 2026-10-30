import { useEffect, useState } from "react";
import { THEMES, type Theme } from "./themes.ts";

export type { Theme };
const key = "lyrics-theme";
function readTheme(): Theme {
  try {
    const value = localStorage.getItem(key);
    const theme = THEMES.find(([id]) => id === value)?.[0];
    if (theme) return theme;
  } catch {
    /* Storage may be disabled; theme still works for this session. */
  }
  return "system";
}
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      const activeTheme =
        theme === "system" ? (dark ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = activeTheme;
      document.documentElement.style.colorScheme = activeTheme;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", dark ? "#0f110f" : "#f2f3f0");
    };
    apply();
    media.addEventListener("change", apply);
    try {
      localStorage.setItem(key, theme);
    } catch {
      /* Session-only fallback. */
    }
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === key || event.key === null) setTheme(readTheme());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return { theme, setTheme };
}
