/** Moves a `YYYY-MM-DD` date by whole days (calendar math only, no time zone). */
export const shiftDate = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

export type CalendarDay = { date: string; future: boolean };

/**
 * Dates for a streak grid of the last `weeks` weeks: one array per week
 * (Sunday first); the last week holds `today` and marks later days as future.
 */
export function calendarWeeks(today: string, weeks: number): CalendarDay[][] {
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const start = shiftDate(today, -(weekday + 7 * (weeks - 1)));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = shiftDate(start, w * 7 + d);
      return { date, future: date > today };
    }),
  );
}

/** Upper bounds of grass shades 1–3; anything above the last is shade 4. */
export const PLAY_LEVELS = [2, 5, 9];

/** 0 = not played, 1–4 = darker with more questions finished that day. */
export function playLevel(count: number): number {
  if (count <= 0) return 0;
  const level = PLAY_LEVELS.findIndex((max) => count <= max);
  return level === -1 ? PLAY_LEVELS.length + 1 : level + 1;
}
