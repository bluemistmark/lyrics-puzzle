import type { QuestionRow } from "../data/build-catalog.ts";

/** Lines shorter than this (after normalizing) repeat too often to be worth a warning. */
const MIN_LENGTH = 4;

/** Compares lyric lines ignoring case, spaces and punctuation. */
export const lineKey = (line: string) =>
  line
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, "");

export type Overlap = {
  /** The other question that shares a line. */
  questionId: string;
  songId: string;
  /** The shared line as written in `lines`. */
  line: string;
};

/**
 * Other questions that contain one of `lines` (e.g. the same chorus entered twice).
 * A warning only: repeated lines can be intentional.
 */
export function findOverlaps(
  lines: readonly string[],
  questions: readonly QuestionRow[],
  selfId?: string,
): Overlap[] {
  const wanted = new Map<string, string>();
  for (const line of lines) {
    const key = lineKey(line);
    if (key.length >= MIN_LENGTH && !wanted.has(key))
      wanted.set(key, line.trim());
  }
  if (!wanted.size) return [];
  const found: Overlap[] = [];
  for (const q of questions) {
    if (q.id === selfId) continue;
    const shared = new Set(q.lines.map(lineKey).filter((k) => wanted.has(k)));
    for (const key of shared)
      found.push({
        questionId: q.id,
        songId: q.song_id,
        line: wanted.get(key)!,
      });
  }
  return found.sort((a, b) => (a.questionId < b.questionId ? -1 : 1));
}
