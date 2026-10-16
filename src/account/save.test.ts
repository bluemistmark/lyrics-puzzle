import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyFeats } from "../achievements.ts";
import type { Round } from "../store.ts";
import { mergeDaily, mergeSaves, parseSave, type SaveData } from "./save.ts";

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

test("아는 곡·모르는 곡 표시는 기록 초기화와 관계없이 나중에 바꾼 쪽이 이김", () => {
  const before = save({
    collected: ["q1"],
    songPrefs: { a: { pref: "known", at: 10 } },
  });
  const afterReset = save({
    resetAt: 1000,
    songPrefs: { a: { pref: "unknown", at: 20 } },
  });
  for (const merged of [
    mergeSaves(afterReset, before),
    mergeSaves(before, afterReset),
  ])
    assert.deepEqual(merged.songPrefs, { a: { pref: "unknown", at: 20 } });
  // Saves from before the marks merge as having none.
  assert.deepEqual(mergeSaves(save(), save()).songPrefs, {});
  assert.deepEqual(
    parseSave({
      ...save(),
      songPrefs: { a: { pref: "known", at: 1 }, b: { pref: "x" } },
    })?.songPrefs,
    { a: { pref: "known", at: 1 } },
  );
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
    // 이 기기가 이미 낸 날짜가 더 나중이라 남는다 (같은 날 두 번 내지 않음).
    submitted: "2026-09-29",
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

test("다른 모드 기록은 모드별 큰 값으로 합치고, 예전 저장값에 없으면 0으로 봄", () => {
  const phone = save({
    modeStats: {
      simple: { solved: 3, givenUp: 1 },
      easy: { solved: 0, givenUp: 2 },
    },
  });
  const old = save();
  const merged = mergeSaves(phone, old);
  assert.deepEqual(merged.modeStats, phone.modeStats);
  const pc = save({
    modeStats: {
      simple: { solved: 1, givenUp: 4 },
      easy: { solved: 5, givenUp: 0 },
    },
  });
  assert.deepEqual(mergeSaves(phone, pc).modeStats, {
    simple: { solved: 3, givenUp: 4 },
    easy: { solved: 5, givenUp: 2 },
  });
});

const round = (patch: Partial<Round> = {}): Round => ({
  id: "q1",
  revealed: [],
  words: [],
  solved: false,
  givenUp: false,
  english: false,
  artist: false,
  hints: 0,
  wordHints: 0,
  counted: false,
  ...patch,
});
const day = (date: string, patch: Partial<Round> = {}) => ({
  date,
  round: round(patch),
});

test("오늘 데일리는 끝낸 쪽이, 둘 다 끝냈으면 저장된 쪽이, 아니면 더 진행한 쪽이 남음", () => {
  const today = "2026-10-11";
  const solved = day(today, {
    solved: true,
    words: [{ word: "a", hit: true }],
  });
  const fresh = day(today);
  assert.equal(mergeDaily(fresh, solved), solved);
  assert.equal(mergeDaily(solved, fresh), solved);
  const gaveUp = day(today, { givenUp: true });
  assert.equal(mergeDaily(gaveUp, solved), solved);
  const started = day(today, { hints: 2 });
  assert.equal(mergeDaily(fresh, started), started);
  assert.equal(mergeDaily(started, fresh), started);
  // A newer day wins, and a missing side takes the other.
  const yesterday = day("2026-10-10", { solved: true });
  assert.equal(mergeDaily(fresh, yesterday), fresh);
  assert.equal(mergeDaily(undefined, solved), solved);
  // Different question on the same day: this device's catalog wins.
  assert.equal(
    mergeDaily(fresh, day(today, { id: "q2", solved: true })),
    fresh,
  );
});

test("데일리 진행 상태도 계정 기록에 합쳐지고, 모양이 잘못되면 그 부분만 버림", () => {
  const solved = day("2026-10-11", { solved: true });
  assert.deepEqual(
    mergeSaves(save({ daily: day("2026-10-11") }), save({ daily: solved }))
      .daily,
    solved,
  );
  const parsed = parseSave({ ...save(), daily: { date: "2026-10-11" } });
  assert.ok(parsed);
  assert.equal(parsed.daily, undefined);
  assert.deepEqual(parseSave({ ...save(), daily: solved })?.daily, solved);
});

test("데일리를 맞힌 뒤 가사를 더 풀면 동기화가 맞힌 직후 상태로 되돌리지 않음", () => {
  const today = "2026-10-11";
  const solvedNow = day(today, {
    solved: true,
    revealed: ["0:0:0", "0:0:1"],
    words: [{ word: "사랑", hit: true }],
  });
  const filledMore = day(today, {
    solved: true,
    revealed: ["0:0:0", "0:0:1", "0:1:0", "0:1:1"],
    words: [
      { word: "사랑", hit: true },
      { word: "하늘", hit: true },
    ],
  });
  assert.equal(mergeDaily(filledMore, solvedNow), filledMore);
  assert.equal(mergeDaily(solvedNow, filledMore), filledMore);
  // 결과가 다르면(한쪽은 정답, 한쪽은 포기) 저장된 쪽을 따른다.
  const gaveUpMore = day(today, { givenUp: true, hints: 9 });
  assert.equal(mergeDaily(gaveUpMore, solvedNow), solvedNow);
});

test("포기로 끊긴 연속 정답은 동기화가 되살리지 않고, 최고 기록만 큰 값으로 합침", () => {
  const stats = save().stats;
  const synced = save({ stats: { ...stats, solved: 4, streak: 4, best: 4 } });
  const afterGiveUp = save({
    stats: { ...stats, solved: 4, skipped: 1, streak: 0, best: 4 },
  });
  const merged = mergeSaves(afterGiveUp, synced);
  assert.equal(merged.stats.streak, 0);
  assert.equal(merged.stats.best, 4);
  assert.equal(merged.stats.skipped, 1);
});

test("로그인 전에 오늘 랭킹을 낸 기기는 계정 토큰으로 바뀌어도 다시 내지 않음", () => {
  const device = save({
    ranking: {
      token: "device",
      nickname: "",
      submitted: "2026-10-11",
      asked: true,
    },
  });
  const account = save({
    ranking: {
      token: "account",
      nickname: "네오",
      submitted: "2026-10-10",
      asked: false,
    },
  });
  const merged = mergeSaves(device, account);
  assert.equal(merged.ranking.token, "account");
  assert.equal(merged.ranking.nickname, "네오");
  assert.equal(merged.ranking.submitted, "2026-10-11");
  assert.equal(merged.ranking.asked, true);
});
