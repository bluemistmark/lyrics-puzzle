import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCollection } from "./collection.ts";
import type { Song } from "./game.ts";

const song = (id: string, unit: string): Song => ({
  id,
  artist: unit,
  unit,
  title: id,
  aliases: [],
});
const songs = [
  song("A1", "A"),
  song("B1", "B"),
  song("A2", "A"),
  song("A3", "A"),
];
const questions = [
  { id: "q1", songId: "A1" },
  { id: "q2", songId: "A1" },
  { id: "q3", songId: "B1" },
  { id: "q4", songId: "A2" },
];

test("도감은 유닛별로 곡 순서를 유지하고 문제가 없는 곡은 제외", () => {
  const result = buildCollection(songs, questions, []);
  assert.deepEqual(
    result.map((u) => [u.unit, u.songs.map((s) => s.song.id)]),
    [
      ["A", ["A1", "A2"]],
      ["B", ["B1"]],
    ],
  );
  assert.deepEqual(
    result[0].songs.map((s) => s.total),
    [2, 1],
  );
});

test("도감은 한 구간이라도 맞힌 곡을 수집으로 세고 없는 문제 ID는 무시", () => {
  const [a, b] = buildCollection(songs, questions, ["q2", "gone", "q2"]);
  assert.equal(a.collected, 1);
  assert.deepEqual(
    a.songs.map((s) => s.solved),
    [1, 0],
  );
  assert.equal(b.collected, 0);
});
