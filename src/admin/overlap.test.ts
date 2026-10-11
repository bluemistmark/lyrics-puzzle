import { test } from "node:test";
import assert from "node:assert/strict";
import { findOverlaps } from "./overlap.ts";

const q = (id: string, song_id: string, lines: string[]) => ({
  id,
  song_id,
  lines,
  active: true,
});
const questions = [
  q("Q1", "S1", ["너를 처음 본 순간", "멈춰 버린 시간"]),
  q("Q2", "S2", ["다른 노래 가사", "Hello, World!"]),
  q("Q3", "S1", ["오", "짧은 줄"]),
];

test("대소문자·공백·문장부호를 무시하고 같은 줄을 가진 다른 문제를 찾음", () => {
  assert.deepEqual(
    findOverlaps(["너를 처음본 순간!", "hello world"], questions),
    [
      { questionId: "Q1", songId: "S1", line: "너를 처음본 순간!" },
      { questionId: "Q2", songId: "S2", line: "hello world" },
    ],
  );
});

test("자기 자신과 너무 짧은 줄은 경고하지 않음", () => {
  assert.deepEqual(
    findOverlaps(["너를 처음 본 순간", "멈춰"], questions, "Q1"),
    [],
  );
  assert.deepEqual(findOverlaps(["오", ""], questions), []);
});
