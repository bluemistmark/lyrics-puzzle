import type { Catalog } from "../data/build-catalog.ts";

/** Row of the `daily_stats` view (see supabase/migrations). */
export type DailyStat = {
  date: string;
  participants: number;
  solved: number;
  avg_hints: number | null;
  avg_guesses: number | null;
};

/** `YYYY-MM-DD` shifted by whole days (dates only, no time zone involved). */
export function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The `days` dates ending at `today`, oldest first, with days nobody played as zeros. */
export function fillDays(
  rows: readonly DailyStat[],
  today: string,
  days: number,
): DailyStat[] {
  const byDate = new Map(rows.map((r) => [r.date, r]));
  return Array.from({ length: days }, (_, i) => {
    const date = shiftDate(today, i - days + 1);
    return (
      byDate.get(date) ?? {
        date,
        participants: 0,
        solved: 0,
        avg_hints: null,
        avg_guesses: null,
      }
    );
  });
}

export const solveRate = (s: Pick<DailyStat, "participants" | "solved">) =>
  s.participants ? Math.round((s.solved / s.participants) * 100) : null;

/** Published songs and questions per unit, in the catalog's (= game's) unit order. */
export function unitCounts(catalog: Catalog) {
  const units = new Map<
    string,
    { unit: string; songs: number; questions: number }
  >();
  const unitOf = new Map(catalog.songs.map((s) => [s.id, s.unit]));
  for (const s of catalog.songs) {
    const row = units.get(s.unit) ?? { unit: s.unit, songs: 0, questions: 0 };
    row.songs++;
    units.set(s.unit, row);
  }
  for (const q of catalog.questions) {
    const row = units.get(unitOf.get(q.songId)!);
    if (row) row.questions++;
  }
  return [...units.values()];
}
