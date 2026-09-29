import type { Question } from "./game.ts";
import { isPlayMode, playModeName, type PlayMode } from "./modes.ts";

/** One cell per reveal key: `hit` once revealed, `miss` otherwise. Lines keep their words apart. */
export type ShareCell = "hit" | "miss";
export type ShareGrid = ShareCell[][][];

const hangul = (c: string) => /^[가-힣]$/.test(c);

/** Lines → words → cells, mirroring the reveal keys in game.ts (no lyrics text leaves this). */
export function shareGrid(q: Question, revealed: readonly string[]): ShareGrid {
  const shown = new Set(revealed);
  return q.lines.map((line, l) =>
    line.flatMap((t, w): ShareCell[][] => {
      if (t.pronunciation)
        return [[shown.has(`${l}:${w}:en`) ? "hit" : "miss"]];
      const cells = [...t.text].flatMap((c, i): ShareCell[] =>
        hangul(c) ? [shown.has(`${l}:${w}:${i}`) ? "hit" : "miss"] : [],
      );
      return cells.length ? [cells] : [];
    }),
  );
}

export type PlayResult = {
  mode: PlayMode;
  solved: boolean;
  givenUp: boolean;
  percent: number;
  guesses: number;
  hints: number;
};

/** Spoiler-free share text for a finished play-tab question. */
export function playResultText(r: PlayResult): string {
  const outcome = r.givenUp
    ? "🎧 정답 확인"
    : r.mode === "easy"
      ? "🎉 가사 완성"
      : "🎉 제목 정답";
  const stats =
    r.mode === "simple"
      ? `힌트 ${r.hints}번`
      : `가사 복원 ${r.percent}% · 단어 ${r.guesses}번 · 힌트 ${r.hints}번`;
  return [
    `네오 노래 퀴즈 · ${playModeName(r.mode)} 모드`,
    outcome,
    stats,
    "같은 문제에 도전해 보세요!",
  ].join("\n");
}

export type SharedLink = { id: string; mode: PlayMode };

/** Reads a same-question link (`questionLink`); an unknown mode falls back to classic. */
export function parseSharedLink(href: string): SharedLink | null {
  const params = new URL(href).searchParams;
  const id = params.get("q");
  if (!id) return null;
  const mode = params.get("mode");
  return { id, mode: isPlayMode(mode) ? mode : "classic" };
}

/** Link that opens the same question in the same mode (see `openQuestion` in the store). */
export function questionLink(base: string, id: string, mode: PlayMode) {
  const url = new URL(base);
  url.search = "";
  url.hash = "";
  url.searchParams.set("q", id);
  url.searchParams.set("mode", mode);
  return url.href;
}
