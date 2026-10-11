import { sortDictionary, scanLine } from "./data/english.ts";
import { allKeys, type Question } from "./game.ts";

// 직접 입력 가사 모드의 순수 로직. 입력한 가사는 이 기기에서만 쓰이고 서버로 보내지 않는다.

export const MAX_PUZZLES = 20;
export const MAX_LINES = 150;
export const MAX_LINE_LENGTH = 120;
export const MAX_TITLE_LENGTH = 40;

/** 영어를 사전 없이 그대로 보여 주려고 비어 있는 사전을 쓴다. */
const NO_DICTIONARY = sortDictionary([]);

/** 빈 줄을 버리고 줄마다 앞뒤 공백을 정리한다. */
export function parseLyrics(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** 퍼즐로 만들 수 없는 입력이면 사유를, 괜찮으면 빈 문자열을 돌려준다. */
export function lyricsError(lines: readonly string[]) {
  if (!lines.some((line) => /[가-힣]/.test(line)))
    return "한글이 들어 있는 가사를 입력해 주세요.";
  if (lines.length > MAX_LINES)
    return `가사는 ${MAX_LINES}줄까지 넣을 수 있어요.`;
  if (lines.some((line) => line.length > MAX_LINE_LENGTH))
    return `한 줄은 ${MAX_LINE_LENGTH}자까지 넣을 수 있어요.`;
  return "";
}

const questions = new WeakMap<readonly string[], Question>();
/**
 * 영어(라틴 문자)는 처음부터 보이고 키가 없어 완성률에서 빠진다. 한글만 `줄:토큰:글자` 키를 갖는다.
 * `lines` 배열 참조를 키로 캐시하므로 가사를 바꿀 때는 새 배열을 만든다.
 */
export function customQuestion(
  id: string,
  title: string,
  lines: readonly string[],
): Question {
  let question = questions.get(lines);
  if (!question) {
    question = {
      id,
      songId: "",
      section: "",
      unit: "직접 입력",
      title,
      lines: lines.map((line) => scanLine(line, NO_DICTIONARY).tokens),
    };
    questions.set(lines, question);
  }
  return question;
}

const PAGE_TARGET = 4;
/**
 * 줄을 3~5줄씩 고르게 나눈 쪽의 [시작, 끝) 줄 범위. 3줄 이하는 한 쪽이다.
 * 마지막 쪽만 1~2줄로 남지 않도록 앞쪽부터 한 줄씩 더 싣는다.
 */
export function pageRanges(lineCount: number): [number, number][] {
  const pages = Math.max(1, Math.round(lineCount / PAGE_TARGET));
  const base = Math.floor(lineCount / pages);
  const extra = lineCount % pages;
  const ranges: [number, number][] = [];
  let start = 0;
  for (let i = 0; i < pages; i++) {
    const end = start + base + (i < extra ? 1 : 0);
    ranges.push([start, end]);
    start = end;
  }
  return ranges;
}

/** `line`(0부터)이 들어 있는 쪽 번호(0부터). */
export const pageOfLine = (ranges: readonly [number, number][], line: number) =>
  Math.max(
    0,
    ranges.findIndex(([start, end]) => line >= start && line < end),
  );

/**
 * 쪽마다 한글이 전부 열렸는지. 한글이 하나도 없는 쪽(영어만 있는 줄)은 맞힐 게 없으므로 완성으로 치지 않는다.
 */
export function pageDone(
  question: Question,
  revealed: readonly string[],
  ranges: readonly [number, number][],
) {
  const open = new Set(revealed);
  const left = ranges.map(() => 0);
  const total = ranges.map(() => 0);
  for (const key of allKeys(question)) {
    const page = pageOfLine(ranges, Number(key.split(":")[0]));
    total[page]++;
    if (!open.has(key)) left[page]++;
  }
  return ranges.map((_, i) => total[i] > 0 && left[i] === 0);
}
