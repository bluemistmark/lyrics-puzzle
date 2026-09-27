import { useEffect, useState } from "react";

export type Theme = "system" | "light" | "dark";
const key = "lyrics-theme";
function readTheme(): Theme {
  try {
    const value = localStorage.getItem(key);
    if (value === "light" || value === "dark") return value;
  } catch { /* Storage may be disabled; theme still works for this session. */ }
  return "system";
}
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#141a16" : "#f7f8f4");
    };
    apply();
    media.addEventListener("change", apply);
    try { localStorage.setItem(key, theme); } catch { /* Session-only fallback. */ }
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === key || event.key === null) setTheme(readTheme()); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return { theme, setTheme };
}
