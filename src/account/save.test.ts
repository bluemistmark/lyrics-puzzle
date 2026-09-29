import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyFeats } from "../achievements.ts";
import { mergeSaves, parseSave, type SaveData } from "./save.ts";

const save = (patch: Partial<SaveData> = {}): SaveData => ({
  version: 1,
  resetAt: 0,
  stats: { solved: 0, completed: 0, direct: 0, skipped: 0, streak: 0, best: 0 },
  collected: [],
  dailyHistory: {},
  playLog: {},
  feats: emptyFeats(),
  achievements: {},
  themes: [],
  votes: {},
  ranking: { token: "", nickname: "", submitted: "", asked: false },
  ...patch,
});

test("처음 동기화할 때는 기기 기록을 그대로 올림", () => {
  const local = save({ collected: ["q1"] });
  assert.equal(mergeSaves(local, null), local);
});

test("두 기기의 기록은 큰 값·합집합·먼저 달성한 날짜로 합쳐지고, 다시 합쳐도 그대로", () => {
  const phone = save({
    stats: {
      solved: 10,
      completed: 2,
      direct: 1,
      skipped: 4,
      streak: 3,
      best: 5,
    },
    collected: ["q1", "q2"],
    dailyHistory: { "2026-09-28": { solved: false, guesses: 9, hints: 2 } },
    playLog: { "2026-09-28": 3, "2026-09-29": 5 },
    feats: {
      ...emptyFeats(),
      noWord: 2,
      unit: "NCT WISH",
      unitRun: 4,
      unitBest: 4,
    },
    achievements: { "first-solve": "2026-09-20", "solve-10": "2026-09-29" },
    themes: ["dark"],
    votes: { q1: "hard", q3: "easy" },
  });
  const pc = save({
    stats: {
      solved: 7,
      completed: 5,
      direct: 0,
      skipped: 1,
      streak: 0,
      best: 9,
    },
    collected: ["q2", "q9"],
    dailyHistory: { "2026-09-28": { solved: true, guesses: 3, hints: 0 } },
    playLog: { "2026-09-29": 8 },
    feats: {
      ...emptyFeats(),
      fast: 1,
      unit: "NCT 127",
      unitRun: 1,
      unitBest: 6,
    },
    achievements: { "first-solve": "2026-09-10" },
    themes: ["excel", "dark"],
    votes: { q1: "normal" },
  });
  const merged = mergeSaves(phone, pc);
  assert.deepEqual(merged.stats, {
    solved: 10,
    completed: 5,
    direct: 1,
    skipped: 4,
    streak: 3,
    best: 9,
  });
  assert.deepEqual(merged.collected.sort(), ["q1", "q2", "q9"]);
  // The day's first finish was saved first, so the account's copy stays.
  assert.equal(merged.dailyHistory["2026-09-28"].solved, true);
  assert.deepEqual(merged.playLog, { "2026-09-28": 3, "2026-09-29": 8 });
  assert.deepEqual(merged.feats, {
    ...emptyFeats(),
    noWord: 2,
    fast: 1,
    unit: "NCT WISH",
    unitRun: 4,
    unitBest: 6,
  });
  assert.deepEqual(merged.achievements, {
    "first-solve": "2026-09-10",
    "solve-10": "2026-09-29",
  });
  assert.deepEqual(merged.themes.sort(), ["dark", "excel"]);
  assert.deepEqual(merged.votes, { q1: "hard", q3: "easy" });
  assert.deepEqual(mergeSaves(merged, merged), merged);
});

test("기록 초기화는 더 나중에 초기화한 쪽이 이기지만 테마·난이도 응답·랭킹은 유지", () => {
  const before = save({
    stats: { ...save().stats, solved: 30 },
    collected: ["q1"],
    themes: ["dark"],
    votes: { q1: "easy" },
  });
  const afterReset = save({ resetAt: 1000, themes: ["light"] });
  for (const merged of [
    mergeSaves(afterReset, before),
    mergeSaves(before, afterReset),
  ]) {
    assert.equal(merged.resetAt, 1000);
    assert.equal(merged.stats.solved, 0);
    assert.deepEqual(merged.collected, []);
    assert.deepEqual(merged.themes.sort(), ["dark", "light"]);
    assert.deepEqual(merged.votes, { q1: "easy" });
  }
});

test("로그인한 기기는 계정에 저장된 랭킹 토큰을 따르고, 계정에 없으면 기기 토큰을 올림", () => {
  const device = save({
    ranking: {
      token: "device",
      nickname: "폰",
      submitted: "2026-09-29",
      asked: true,
    },
  });
  const account = save({
    ranking: {
      token: "account",
      nickname: "시즈니",
      submitted: "2026-09-28",
      asked: false,
    },
  });
  assert.deepEqual(mergeSaves(device, account).ranking, {
    token: "account",
    nickname: "시즈니",
    submitted: "2026-09-28",
    asked: true,
  });
  assert.equal(mergeSaves(device, save()).ranking.token, "device");
});

test("형식이 맞지 않는 저장값은 없는 것으로 봄", () => {
  assert.equal(parseSave(null), null);
  assert.equal(parseSave({ version: 2 }), null);
  assert.equal(parseSave({ ...save(), collected: "q1" }), null);
  assert.deepEqual(parseSave(save()), save());
});
