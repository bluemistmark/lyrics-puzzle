import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACHIEVEMENT_GROUPS,
  achievementList,
  earnedAchievements,
  emptyFeats,
  FAST_MS,
  recordGiveUp,
  recordSolve,
  type AchievementInput,
} from "./achievements.ts";
import type { Song } from "./game.ts";
import { THEMES } from "./themes.ts";

// Fixture catalog so editing real data can't break these rules.
const song = (id: string, unit: string): Song => ({
  id,
  artist: unit,
  unit,
  title: id,
  aliases: [],
});
const catalog = {
  songs: [song("A1", "A"), song("A2", "A"), song("B1", "B")],
  questions: [
    { id: "a1", songId: "A1" },
    { id: "a1b", songId: "A1" },
    { id: "a2", songId: "A2" },
    { id: "b1", songId: "B1" },
  ],
};
const list = achievementList(catalog);
const empty: AchievementInput = {
  stats: { solved: 0, completed: 0, direct: 0, best: 0, skipped: 0 },
  collected: [],
  dailyHistory: {},
  playLog: {},
  feats: emptyFeats(),
  themes: [],
  votes: 0,
  hasNickname: false,
  today: "2026-09-29",
};
const progress = (id: string, input: AchievementInput) =>
  list.find((a) => a.id === id)!.progress(input);

test("업적 ID는 겹치지 않고, 모두 분류가 있으며 유닛마다 도감 완성 업적이 생김", () => {
  const ids = list.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(list.every((a) => ACHIEVEMENT_GROUPS.includes(a.group)));
  assert.ok(ids.includes("collect-A") && ids.includes("collect-B"));
  assert.equal(progress("collect-A", empty).goal, 2);
  assert.equal(progress("collect-all", empty).goal, 3);
  // Fewer than 100 songs: the goal is the whole catalog, so it stays reachable.
  assert.equal(progress("collect-100", empty).goal, 3);
  assert.deepEqual(
    list.filter((a) => a.hidden).map((a) => a.id),
    ["give-up-10", "fast", "night", "all-themes"],
  );
});

test("진행도는 목표에서 멈추고 기록 종류별로 계산됨", () => {
  const input: AchievementInput = {
    ...empty,
    stats: { solved: 12, completed: 1, direct: 3, best: 6, skipped: 10 },
    collected: ["a1", "a2"],
    playLog: { "2026-09-27": 1, "2026-09-28": 7, "2026-09-29": 21 },
    dailyHistory: {
      "2026-09-27": { solved: true, guesses: 3, hints: 0 },
      "2026-09-28": { solved: true, guesses: 9, hints: 1 },
      "2026-09-29": { solved: true, guesses: 2, hints: 2 },
    },
    votes: 25,
    hasNickname: true,
    themes: ["system", "dark"],
  };
  assert.deepEqual(progress("solve-10", input), { current: 10, goal: 10 });
  assert.deepEqual(progress("solve-50", input), { current: 12, goal: 50 });
  assert.deepEqual(progress("streak-10", input), { current: 6, goal: 10 });
  assert.deepEqual(progress("busy-day", input), { current: 20, goal: 20 });
  assert.deepEqual(progress("play-days-7", input), { current: 3, goal: 7 });
  assert.deepEqual(progress("daily-streak-7", input), { current: 3, goal: 7 });
  assert.deepEqual(progress("daily-solved-30", input), {
    current: 3,
    goal: 30,
  });
  assert.deepEqual(progress("daily-perfect", input), { current: 1, goal: 1 });
  assert.deepEqual(progress("collect-A", input), { current: 2, goal: 2 });
  assert.deepEqual(progress("collect-B", input), { current: 0, goal: 1 });
  assert.deepEqual(progress("votes-20", input), { current: 20, goal: 20 });
  assert.deepEqual(progress("nickname", input), { current: 1, goal: 1 });
  assert.deepEqual(progress("give-up-10", input), { current: 10, goal: 10 });
  assert.deepEqual(progress("all-themes", input), {
    current: 2,
    goal: THEMES.length,
  });
});

test("완곡은 구간이 여러 개인 곡의 모든 구간을 맞혀야 달성", () => {
  // A2 has one question only, so solving it doesn't count.
  assert.equal(
    progress("full-song", { ...empty, collected: ["a2", "a1"] }).current,
    0,
  );
  assert.equal(
    progress("full-song", { ...empty, collected: ["a1", "a1b"] }).current,
    1,
  );
});

test("꾸준함은 비어 있는 날에 끊기는 가장 긴 연속 플레이 일수", () => {
  const playLog = {
    "2026-02-26": 1,
    "2026-02-27": 2,
    "2026-02-28": 1,
    "2026-03-01": 1,
    "2026-03-03": 5,
    "2026-03-04": 0,
  };
  assert.equal(progress("play-days-7", { ...empty, playLog }).current, 4);
});

test("정답 기록: 입력 수·영어 힌트·풀이 시간·새벽·같은 유닛 연속을 셈", () => {
  // 2026-09-29 01:30 in Korea.
  const now = Date.parse("2026-09-28T16:30:00Z");
  const base = {
    mode: "play" as const,
    unit: "A",
    words: 0,
    hasEnglish: true,
    usedEnglishHint: false,
    startedAt: now - 10_000,
    now,
  };
  let feats = recordSolve(emptyFeats(), base);
  assert.deepEqual(feats, {
    noWord: 1,
    oneWord: 1,
    noEnglish: 1,
    fast: 1,
    night: 1,
    unit: "A",
    unitRun: 1,
    unitBest: 1,
  });
  const noon = Date.parse("2026-09-29T03:00:00Z");
  feats = recordSolve(feats, {
    ...base,
    words: 1,
    usedEnglishHint: true,
    startedAt: noon - FAST_MS - 1,
    now: noon,
  });
  assert.equal(feats.noWord, 1);
  assert.equal(feats.oneWord, 2);
  assert.equal(feats.noEnglish, 1);
  assert.equal(feats.fast, 1);
  assert.equal(feats.night, 1);
  assert.equal(feats.unitRun, 2);
  // Rounds saved before 업적 have no start time: never "fast".
  assert.equal(
    recordSolve(feats, { ...base, startedAt: undefined }).fast,
    feats.fast,
  );

  const other = recordSolve(feats, { ...base, unit: "B", now: noon });
  assert.equal(other.unitRun, 1);
  assert.equal(other.unitBest, 2);
  assert.equal(recordGiveUp(other).unitRun, 0);
  // Daily solves don't touch the normal-mode unit run.
  assert.deepEqual(
    recordSolve(other, { ...base, mode: "daily", unit: "A", now: noon })
      .unitRun,
    1,
  );
});

test("새로 달성한 업적만 오늘 날짜로 추가하고 이전 날짜는 유지", () => {
  const first = earnedAchievements(
    list,
    { ...empty, stats: { ...empty.stats, solved: 1 } },
    { "complete-1": "2026-09-01" },
  );
  assert.deepEqual(first, {
    "complete-1": "2026-09-01",
    "first-solve": "2026-09-29",
  });
  // Dropping below the goal later (e.g. a catalog change) doesn't take it away.
  assert.deepEqual(earnedAchievements(list, empty, first), first);
});
