import type { QuestionRow, SongRow } from "../data/build-catalog.ts";

/** Next `NCT_0000`-style question id. */
export function nextQuestionId(questions: QuestionRow[]) {
  const numbers = questions.map((q) =>
    Number(/^NCT_(\d+)$/.exec(q.id)?.[1] ?? 0),
  );
  return `NCT_${String(Math.max(0, ...numbers) + 1).padStart(4, "0")}`;
}

/** Next id using the prefix the artist's songs already use (e.g. `D_058` → `D_059`); "" for a new artist. */
export function nextSongId(songs: SongRow[], artist: string) {
  const ids = songs
    .filter((s) => s.artist === artist.trim())
    .map((s) => /^(.+)_(\d+)$/.exec(s.id))
    .filter((m): m is RegExpExecArray => m !== null);
  if (!ids.length) return "";
  const [, prefix, digits] = ids[0];
  const max = Math.max(
    ...ids.filter((m) => m[1] === prefix).map((m) => Number(m[2])),
  );
  return `${prefix}_${String(max + 1).padStart(digits.length, "0")}`;
}

export const splitList = (value: string) =>
  [...new Set(value.split("|").map((v) => v.trim()))].filter(Boolean);
export const joinList = (values: string[]) => values.join(" | ");
