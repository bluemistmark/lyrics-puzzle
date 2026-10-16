import { initial } from "../data/hangul.ts";

// 어드민 목록의 검색·정렬 규칙 (순수 함수).

const CHOSUNG = /^[ㄱ-ㅎ\s]+$/;
/** Each Hangul syllable as its 초성; other characters stay as they are. */
export const initials = (text: string) => [...text].map(initial).join("");

/**
 * Case-insensitive substring match against any of `values`. A query made only of
 * 초성 (e.g. "ㅅㄹ") also matches Hangul by initials, ignoring spaces.
 */
export function matchesQuery(
  values: readonly (string | null | undefined)[],
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const chosung = CHOSUNG.test(q) ? q.replace(/\s/g, "") : null;
  return values.some((value) => {
    if (!value) return false;
    const text = value.toLowerCase();
    if (text.includes(q)) return true;
    return (
      chosung !== null && initials(text.replace(/\s/g, "")).includes(chosung)
    );
  });
}

export type Sort<K extends string> = { key: K; desc: boolean };

/** URL form of a sort: `title` ascending, `-title` descending. Unknown keys read as `fallback`. */
export function parseSort<K extends string>(
  value: string,
  keys: readonly K[],
  fallback: Sort<K>,
): Sort<K> {
  const desc = value.startsWith("-");
  const key = (desc ? value.slice(1) : value) as K;
  return keys.includes(key) ? { key, desc } : fallback;
}
export const formatSort = <K extends string>(sort: Sort<K>) =>
  `${sort.desc ? "-" : ""}${sort.key}`;

/** Clicking a header: the same column flips, another column starts in its natural direction. */
export function toggleSort<K extends string>(
  current: Sort<K>,
  key: K,
  firstDesc = false,
): Sort<K> {
  return current.key === key
    ? { key, desc: !current.desc }
    : { key, desc: firstDesc };
}

/** Stable sort, so rows that tie keep the order they came in (the tab's default order). */
export function sortRows<T>(
  rows: readonly T[],
  compare: (a: T, b: T) => number,
  desc: boolean,
): T[] {
  return [...rows].sort((a, b) => (desc ? -compare(a, b) : compare(a, b)));
}

export const byText = (a: string, b: string) => a.localeCompare(b, "ko");
export const byNumber = (a: number, b: number) => a - b;
/** Plain code-point order: ids and ISO timestamps (a missing one sorts first). */
export const byCode = (a = "", b = "") => (a < b ? -1 : a > b ? 1 : 0);

/** Short local date and time for list cells, e.g. "10. 16. 14:03". */
export const shortTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("ko-KR", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "";
