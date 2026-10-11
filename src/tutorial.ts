import { customQuestion } from "./custom.ts";
import type { Round } from "./store.ts";

// 첫 방문 튜토리얼. 연습 가사는 실제 곡이 아니라 직접 만든 문장이라 데이터와 무관하다.
export const TUTORIAL_LINES = [
  "오늘도 너의 노래를 불러",
  "우리의 밤이 끝나지 않게",
];
/** The word the tutorial asks the player to type first. */
export const TUTORIAL_WORD = "노래";
export const tutorialQuestion = () =>
  customQuestion("tutorial", "연습 문제", TUTORIAL_LINES);

const KEY = "lyrics-tutorial-done";
export function tutorialDone() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    // Without storage it would open on every visit; treat it as seen.
    return true;
  }
}
export function markTutorialDone() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* Nothing to remember it in. */
  }
}

/** No trace of earlier play, so players from before the tutorial existed don't get it. */
export function isNewPlayer(s: {
  round: Pick<Round, "words" | "hints">;
  collected: readonly string[];
  playLog: Record<string, number>;
  dailyHistory: Record<string, unknown>;
}) {
  return (
    !s.round.words.length &&
    !s.round.hints &&
    !s.collected.length &&
    !Object.keys(s.playLog).length &&
    !Object.keys(s.dailyHistory).length
  );
}
