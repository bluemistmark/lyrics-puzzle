import { useEffect, useState } from "react";

export type Theme =
  "system" | "light" | "dark" | "excel" | "notebook" | "console";
const key = "lyrics-theme";
function readTheme(): Theme {
  try {
    const value = localStorage.getItem(key);
    if (
      value === "light" ||
      value === "dark" ||
      value === "excel" ||
      value === "notebook" ||
      value === "console"
    )
      return value;
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
      document.documentElement.style.colorScheme =
        activeTheme === "dark" || activeTheme === "console" ? "dark" : "light";
      document.querySelector('meta[name="theme-color"]')?.setAttribute(
        "content",
        {
          light: "#f7f8f4",
          dark: "#141a16",
          excel: "#e8ede9",
          notebook: "#fff6ef",
          console: "#17132b",
        }[activeTheme],
      );
      document.title =
        theme === "excel" ? "Sheet1 - 문서" : "NCT 초성 가사 맞히기";
      document
        .querySelector('link[rel="icon"]')
        ?.setAttribute(
          "href",
          theme === "excel" ? "/favicon-excel.svg" : "/favicon.svg",
        );
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
