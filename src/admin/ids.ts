import {
  isPrefix,
  type QuestionRow,
  type SongRow,
} from "../data/build-catalog.ts";

/** `count` consecutive `NCT_0000`-style question ids after the largest existing one. */
export function nextQuestionIds(questions: QuestionRow[], count: number) {
  const numbers = questions.map((q) =>
    Number(/^NCT_(\d+)$/.exec(q.id)?.[1] ?? 0),
  );
  const max = Math.max(0, ...numbers);
  return Array.from(
    { length: count },
    (_, i) => `NCT_${String(max + 1 + i).padStart(4, "0")}`,
  );
}
export const nextQuestionId = (questions: QuestionRow[]) =>
  nextQuestionIds(questions, 1)[0];

/**
 * Next `${prefix}_000` id after every existing song id with that prefix, whoever
 * the artist is, so a reused prefix can't collide (e.g. `D_058` → `D_059`).
 */
export function nextSongId(songs: SongRow[], prefix: string) {
  if (!isPrefix(prefix)) return "";
  const pattern = new RegExp(`^${prefix}_(\\d+)$`);
  const numbers = songs
    .map((s) => pattern.exec(s.id)?.[1])
    .filter((n): n is string => n !== undefined);
  const width = numbers[0]?.length ?? 3;
  const max = Math.max(0, ...numbers.map(Number));
  return `${prefix}_${String(max + 1).padStart(width, "0")}`;
}

export const splitList = (value: string) =>
  [...new Set(value.split("|").map((v) => v.trim()))].filter(Boolean);
export const joinList = (values: string[]) => values.join(" | ");
