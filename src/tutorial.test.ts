import { test } from "node:test";
import assert from "node:assert/strict";
import "./testing/fake-storage.ts";
import { allKeys, matches } from "./game.ts";
import {
  isNewPlayer,
  markTutorialDone,
  TUTORIAL_LINES,
  TUTORIAL_WORD,
  tutorialDone,
  tutorialQuestion,
} from "./tutorial.ts";

test("튜토리얼이 처음 권하는 단어가 실제로 글자를 연다", () => {
  const question = tutorialQuestion();
  const keys = matches(question, TUTORIAL_WORD);
  assert.equal(keys.length, TUTORIAL_WORD.length);
});

test("튜토리얼 가사는 줄을 그대로 입력하면 전부 열린다", () => {
  const question = tutorialQuestion();
  const revealed = TUTORIAL_LINES.flatMap((line) =>
    line.split(" ").flatMap((word) => matches(question, word)),
  );
  assert.deepEqual(new Set(revealed), new Set(allKeys(question)));
});

test("플레이 흔적이 하나라도 있으면 새 플레이어가 아님", () => {
  const fresh = {
    round: { words: [], hints: 0 },
    collected: [],
    playLog: {},
    dailyHistory: {},
  };
  assert.equal(isNewPlayer(fresh), true);
  assert.equal(
    isNewPlayer({
      ...fresh,
      round: { words: [{ word: "a", hit: false }], hints: 0 },
    }),
    false,
  );
  assert.equal(isNewPlayer({ ...fresh, playLog: { "2026-10-11": 1 } }), false);
  assert.equal(
    isNewPlayer({ ...fresh, dailyHistory: { "2026-10-11": {} } }),
    false,
  );
});

test("튜토리얼을 본 기록은 저장소에 남는다", () => {
  localStorage.removeItem("lyrics-tutorial-done");
  assert.equal(tutorialDone(), false);
  markTutorialDone();
  assert.equal(tutorialDone(), true);
});
