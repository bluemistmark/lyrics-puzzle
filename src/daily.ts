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
};

/** Keep the answer and lyrics out of the shared text. */
export function dailyResultText(result: ShareResult): string {
  const outcome = result.solved
    ? "🎉 제목 정답"
    : result.givenUp
      ? "🎧 정답 확인"
      : "🎵 도전 중";
  return [
    `초성 가사 맞히기 · 오늘의 문제 ${result.date.replaceAll("-", ".")}`,
    outcome,
    `가사 복원 ${result.percent}% · 단어 ${result.guesses}번 · 힌트 ${result.hints}번`,
  ].join("\n");
}
