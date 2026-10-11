import { useEffect, useState } from "react";

// 가사 글자 크기. 테마마다 가사 글자 크기(px)가 달라서, 크기 대신 `data-lyrics-size`로
// 가사 영역 전체를 비율로 키운다(base.css의 zoom). index.html의 초기 스크립트도 같은 키를 읽는다.
export const TEXT_SIZES = [
  ["small", "작게"],
  ["normal", "보통"],
  ["large", "크게"],
  ["xlarge", "아주 크게"],
] as const;
export type TextSize = (typeof TEXT_SIZES)[number][0];

const key = "lyrics-text-size";
function readTextSize(): TextSize {
  try {
    const value = localStorage.getItem(key);
    const size = TEXT_SIZES.find(([id]) => id === value)?.[0];
    if (size) return size;
  } catch {
    /* Storage may be disabled; the size still works for this session. */
  }
  return "normal";
}

/** Call only in `App` (like `useTheme`) and pass the value down. */
export function useTextSize() {
  const [size, setSize] = useState<TextSize>(readTextSize);
  useEffect(() => {
    document.documentElement.dataset.lyricsSize = size;
    try {
      localStorage.setItem(key, size);
    } catch {
      /* Session-only fallback. */
    }
  }, [size]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === key || event.key === null) setSize(readTextSize());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return { size, setSize };
}
