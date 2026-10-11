import { test } from "node:test";
import assert from "node:assert/strict";
import "./testing/fake-storage.ts";
import { allKeys, hintKeys, progress } from "./game.ts";
import {
  customQuestion,
  lyricsError,
  pageDone,
  pageOfLine,
  pageRanges,
  parseLyrics,
} from "./custom.ts";

const { useCustom } = await import("./customStore.ts");

const TEXT = "하늘 가득 Blue 바람\n\n  구름이 흘러 간다  \n";

test("빈 줄을 버리고 줄마다 공백을 정리", () => {
  assert.deepEqual(parseLyrics(TEXT), [
    "하늘 가득 Blue 바람",
    "구름이 흘러 간다",
  ]);
});

test("한글이 없거나 너무 길면 오류", () => {
  assert.ok(lyricsError(["only english"]));
  assert.ok(lyricsError(["가".repeat(121)]));
  assert.ok(lyricsError(Array.from({ length: 151 }, () => "가나다")));
  assert.equal(lyricsError(["가나다"]), "");
});

test("영어는 키가 없어 완성률에서 빠지고 한글만 센다", () => {
  const q = customQuestion("t1", "시험", parseLyrics(TEXT));
  const keys = allKeys(q);
  assert.ok(keys.every((key) => !key.endsWith(":en")));
  assert.equal(keys.length, "하늘가득바람구름이흘러간다".length);
  assert.deepEqual(progress(q, []), { count: 0, total: keys.length });
});

test("힌트는 아직 안 열린 단어 하나를 무작위로 골라 그 단어의 남은 글자를 연다", () => {
  const q = customQuestion("t2", "시험", ["하늘 바다"]);
  const first = () => 0;
  const last = () => 0.99;
  assert.deepEqual(hintKeys(q, [], undefined, first), ["0:0:0", "0:0:1"]);
  assert.deepEqual(hintKeys(q, [], undefined, last), ["0:2:0", "0:2:1"]);
  assert.deepEqual(hintKeys(q, ["0:0:0"], undefined, first), ["0:0:1"]);
  assert.deepEqual(hintKeys(q, ["0:0:0", "0:0:1"], undefined, first), [
    "0:2:0",
    "0:2:1",
  ]);
  assert.deepEqual(hintKeys(q, allKeys(q)), []);
});

test("힌트는 줄 범위 안의 단어만 고르고, 범위에 열 단어가 없으면 빈 배열", () => {
  const q = customQuestion("t4", "시험", ["하늘", "바다", "구름", "달빛"]);
  for (let i = 0; i < 20; i++) {
    const keys = hintKeys(q, [], [1, 3]);
    assert.ok(keys.length > 0);
    assert.ok(keys.every((key) => ["1", "2"].includes(key.split(":")[0])));
  }
  const open = allKeys(q).filter((key) => key.startsWith("1:"));
  assert.deepEqual(hintKeys(q, open, [1, 2]), []);
});

test("저장소: 추가·맞히기·힌트·처음부터·삭제", () => {
  useCustom.setState({ puzzles: [] });
  const added = useCustom.getState().add(" ", "하늘 바다\n구름 Blue");
  assert.ok(added.ok);
  const id = added.ok ? added.id : "";
  assert.equal(useCustom.getState().puzzles[0].title, "제목 없음");

  assert.deepEqual(useCustom.getState().guess(id, "하늘"), {
    matched: 2,
    gained: 2,
  });
  assert.deepEqual(useCustom.getState().guess(id, "하늘"), {
    matched: 2,
    gained: 0,
  });
  assert.deepEqual(useCustom.getState().guess(id, "없는말"), {
    matched: 0,
    gained: 0,
  });

  assert.ok(useCustom.getState().hint(id));
  assert.equal(useCustom.getState().puzzles[0].hints, 1);
  assert.equal(useCustom.getState().puzzles[0].revealed.length, 4);

  useCustom.getState().resetProgress(id);
  assert.deepEqual(useCustom.getState().puzzles[0].revealed, []);
  assert.equal(useCustom.getState().puzzles[0].hints, 0);
  assert.equal(useCustom.getState().puzzles[0].lines.length, 2);

  useCustom.getState().remove(id);
  assert.equal(useCustom.getState().puzzles.length, 0);
});

test("저장소: 잘못된 입력과 개수 제한은 오류", () => {
  useCustom.setState({ puzzles: [] });
  assert.equal(useCustom.getState().add("a", "english only").ok, false);
  for (let i = 0; i < 20; i++) useCustom.getState().add(`곡${i}`, "가나다");
  const over = useCustom.getState().add("넘침", "가나다");
  assert.equal(over.ok, false);
  useCustom.setState({ puzzles: [] });
});

test("쪽 나누기: 3~5줄로 고르게 나누고 빠지는 줄이 없음", () => {
  for (let n = 1; n <= 150; n++) {
    const ranges = pageRanges(n);
    assert.equal(ranges[0][0], 0);
    assert.equal(ranges[ranges.length - 1][1], n);
    ranges.forEach(([start, end], i) => {
      if (i) assert.equal(start, ranges[i - 1][1]);
      if (n >= 3) assert.ok(end - start >= 3 && end - start <= 5, `${n}줄`);
    });
  }
  assert.deepEqual(pageRanges(7), [
    [0, 4],
    [4, 7],
  ]);
  assert.deepEqual(pageRanges(2), [[0, 2]]);
});

test("줄이 들어 있는 쪽 번호", () => {
  const ranges = pageRanges(7);
  assert.equal(pageOfLine(ranges, 0), 0);
  assert.equal(pageOfLine(ranges, 3), 0);
  assert.equal(pageOfLine(ranges, 4), 1);
  assert.equal(pageOfLine(ranges, 99), 0);
});

test("쪽 완성 표식: 그 쪽의 한글이 전부 열려야 하고, 한글이 없는 쪽은 제외", () => {
  const lines = ["하늘 바다", "구름", "달", "별 빛", "Hello", "Yes"];
  const q = customQuestion("t3", "시험", lines);
  const ranges: [number, number][] = [
    [0, 3],
    [3, 4],
    [4, 6],
  ];
  assert.deepEqual(pageDone(q, [], ranges), [false, false, false]);
  const first = allKeys(q).filter((key) => Number(key.split(":")[0]) < 3);
  assert.deepEqual(pageDone(q, first, ranges), [true, false, false]);
  assert.deepEqual(pageDone(q, first.slice(1), ranges), [false, false, false]);
  assert.deepEqual(pageDone(q, allKeys(q), ranges), [true, true, false]);
});

test("저장소: 힌트는 지정한 줄 범위의 단어만 열고 횟수를 셈", () => {
  useCustom.setState({ puzzles: [] });
  const added = useCustom.getState().add("범위", "하늘\n바다\n구름\n달빛");
  const id = added.ok ? added.id : "";
  assert.ok(useCustom.getState().hint(id, [2, 3]));
  const { revealed, hints } = useCustom.getState().puzzles[0];
  assert.deepEqual(revealed.sort(), ["2:0:0", "2:0:1"]);
  assert.equal(hints, 1);
  assert.equal(useCustom.getState().hint(id, [2, 3]), false);
  assert.equal(useCustom.getState().puzzles[0].hints, 1);
  useCustom.setState({ puzzles: [] });
});
