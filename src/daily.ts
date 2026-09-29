import { shiftDate } from "./calendar.ts";

/** Today's date in Korea, so every player gets the same calendar day. */
export function koreaDate(now = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

/** Pick from stable IDs, independent of the catalog's display order. */
export function dailyQuestionId(date: string, ids: readonly string[]): string {
  if (!ids.length) throw Error("오늘의 문제로 낼 곡이 없어요.");
  const sorted = [...ids].sort();
  let hash = 2166136261;
  for (const char of date) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return sorted[(hash >>> 0) % sorted.length];
}

type ShareResult = {
  date: string;
  solved: boolean;
  givenUp: boolean;
  percent: number;
  guesses: number;
  hints: number;
  /** Current daily win streak; shown when it is 2 days or more. */
  streak?: number;
};

/** Keep the answer and lyrics out of the shared text. */
export function dailyResultText(result: ShareResult): string {
  const outcome = result.solved
    ? "🎉 제목 정답"
    : result.givenUp
      ? "🎧 정답 확인"
      : "🎵 도전 중";
  return [
    `NCT 노래 퀴즈 · 오늘의 문제 ${result.date.replaceAll("-", ".")}`,
    outcome,
    `가사 복원 ${result.percent}% · 단어 ${result.guesses}번 · 힌트 ${result.hints}번`,
    ...(result.solved && (result.streak ?? 0) >= 2
      ? [`🔥 ${result.streak}일 연속 정답`]
      : []),
  ].join("\n");
}

/** How a finished daily challenge ended, keyed by its Korean date. */
export type DailyResult = { solved: boolean; guesses: number; hints: number };
export type DailyHistory = Record<string, DailyResult>;

export type DailySummary = {
  played: number;
  solved: number;
  /** Consecutive solved days up to today, or up to yesterday while today is unfinished. */
  current: number;
  best: number;
  /** Mean words entered on solved days (one decimal), or null before the first win. */
  average: number | null;
};

export function dailySummary(
  history: DailyHistory,
  today: string,
): DailySummary {
  const dates = Object.keys(history)
    .filter((d) => d <= today)
    .sort();
  let solved = 0;
  let guesses = 0;
  let best = 0;
  let run = 0;
  let last = "";
  for (const date of dates) {
    const result = history[date];
    if (result.solved) {
      solved++;
      guesses += result.guesses;
      run = shiftDate(date, -1) === last ? run + 1 : 1;
      best = Math.max(best, run);
    } else run = 0;
    last = date;
  }
  let current = 0;
  let date = history[today] ? today : shiftDate(today, -1);
  while (history[date]?.solved) {
    current++;
    date = shiftDate(date, -1);
  }
  const average = solved ? Math.round((guesses / solved) * 10) / 10 : null;
  return { played: dates.length, solved, current, best, average };
}
