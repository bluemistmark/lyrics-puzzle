import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_KNOWN_SETTINGS,
  cleanSongPrefs,
  knownSettingsIssues,
  mergeSongPrefs,
  signalCount,
  songSignals,
  songWeights,
  weightedPick,
} from "./known.ts";

const questions = [
  { id: "a1", songId: "a" },
  { id: "a2", songId: "a" },
  { id: "b1", songId: "b" },
  { id: "c1", songId: "c" },
];

test("도감에 있는 곡과 아는 곡 표시는 아는 곡, 모르는 곡 표시가 도감보다 우선", () => {
  const { known, unknown } = songSignals(questions, ["a1", "b1"], {
    b: { pref: "unknown", at: 1 },
    c: { pref: "known", at: 1 },
    d: { pref: null, at: 1 },
  });
  assert.deepEqual([...known].sort(), ["a", "c"]);
  assert.deepEqual([...unknown], ["b"]);
  // 같은 곡의 여러 구간은 한 곡으로 센다.
  assert.equal(signalCount(questions, ["a1", "a2"], {}), 1);
});

test("아는 곡·모르는 곡이 기준 곡 수보다 적으면 가중치 없음", () => {
  const prefs = { c: { pref: "unknown" as const, at: 1 } };
  const settings = { knownWeight: 4, unknownWeight: 0.5, minSignalSongs: 3 };
  assert.equal(songWeights(questions, ["a1"], prefs, settings), null);
  const weights = songWeights(questions, ["a1"], prefs, {
    ...settings,
    minSignalSongs: 2,
  });
  assert.equal(weights?.get("a"), 4);
  assert.equal(weights?.get("c"), 0.5);
  assert.equal(weights?.has("b"), false);
});

test("출제 설정은 허용 범위 안의 값만 통과", () => {
  assert.deepEqual(knownSettingsIssues(DEFAULT_KNOWN_SETTINGS), []);
  const ok = { knownWeight: 1, unknownWeight: 1, minSignalSongs: 0 };
  assert.deepEqual(knownSettingsIssues(ok), []);
  assert.equal(knownSettingsIssues({ ...ok, knownWeight: 0.5 }).length, 1);
  assert.equal(knownSettingsIssues({ ...ok, unknownWeight: 0 }).length, 1);
  assert.equal(knownSettingsIssues({ ...ok, unknownWeight: NaN }).length, 1);
  assert.equal(knownSettingsIssues({ ...ok, minSignalSongs: 2.5 }).length, 1);
  assert.equal(knownSettingsIssues({ ...ok, minSignalSongs: -1 }).length, 1);
});

test("가중치에 비례해 고름", () => {
  const items = ["x", "y"];
  const weight = (item: string) => (item === "x" ? 3 : 1);
  assert.equal(
    weightedPick(items, weight, () => 0),
    "x",
  );
  assert.equal(
    weightedPick(items, weight, () => 0.74),
    "x",
  );
  assert.equal(
    weightedPick(items, weight, () => 0.76),
    "y",
  );
  assert.equal(
    weightedPick(items, weight, () => 0.9999),
    "y",
  );
});

test("곡 표시는 나중에 바꾼 쪽이 이기고, 지운 표시도 유지되며, 다시 합쳐도 그대로", () => {
  const phone = {
    a: { pref: "known" as const, at: 10 },
    b: { pref: null, at: 30 },
  };
  const pc = {
    a: { pref: "unknown" as const, at: 20 },
    b: { pref: "known" as const, at: 5 },
    c: { pref: "known" as const, at: 1 },
  };
  const merged = mergeSongPrefs(phone, pc);
  assert.deepEqual(merged, {
    a: { pref: "unknown", at: 20 },
    b: { pref: null, at: 30 },
    c: { pref: "known", at: 1 },
  });
  assert.deepEqual(mergeSongPrefs(merged, pc), merged);
  assert.deepEqual(mergeSongPrefs(pc, merged), merged);
  assert.deepEqual(mergeSongPrefs(undefined, undefined), {});
});

test("잘못된 곡 표시는 그 항목만 버림", () => {
  assert.deepEqual(cleanSongPrefs(null), {});
  assert.deepEqual(cleanSongPrefs("known"), {});
  assert.deepEqual(
    cleanSongPrefs({
      a: { pref: "known", at: 1 },
      b: { pref: "maybe", at: 1 },
      c: { pref: "unknown" },
      d: null,
      e: { pref: null, at: 2 },
    }),
    { a: { pref: "known", at: 1 }, e: { pref: null, at: 2 } },
  );
});
