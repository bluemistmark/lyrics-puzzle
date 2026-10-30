import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCollection,
  recentSongIds,
  unitArts,
  unitsByRecent,
} from "./collection.ts";
import type { Song } from "./game.ts";

const song = (id: string, unit: string): Song => ({
  id,
  artist: unit,
  unit,
  main: unit === "A",
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
    result.map((u) => u.main),
    [true, false],
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

test("최근 맞힌 곡은 최근 순서로 곡마다 한 번, 유닛 커버는 맞힌 곡의 서로 다른 앨범아트만", () => {
  const withArt = [
    { ...song("A1", "A"), art: "/x.jpg" },
    song("B1", "B"),
    { ...song("A2", "A"), art: "/x.jpg" },
    { ...song("A3", "A"), art: "/y.jpg" },
  ];
  const qs = [...questions, { id: "q5", songId: "A3" }];
  const recent = recentSongIds(qs, ["q4", "q1", "q3", "q2", "gone"]);
  assert.deepEqual(recent, ["A1", "B1", "A2"]);
  const [a] = buildCollection(withArt, qs, ["q4", "q1"]);
  // A3 isn't guessed: its cover stays hidden. A1 and A2 share one album.
  assert.deepEqual(unitArts(a, recent), ["/x.jpg"]);
  assert.deepEqual(unitArts(a, ["A3", "A1"]), ["/x.jpg"]);
  const [all] = buildCollection(withArt, qs, ["q4", "q1", "q5"]);
  assert.deepEqual(unitArts(all, ["A3", "A1"]), ["/y.jpg", "/x.jpg"]);
  assert.deepEqual(unitArts(all, ["A3", "A1"], 1), ["/y.jpg"]);
});

test("요약 도감 카드: 가장 최근에 맞힌 곡의 유닛부터, 맞힌 곡이 없는 유닛은 원래 순서로 뒤에", () => {
  const units = buildCollection(
    [...songs, song("C1", "C")],
    [...questions, { id: "q5", songId: "C1" }],
    ["q1", "q3"],
  );
  const order = (recent: string[]) =>
    unitsByRecent(units, recent).map((u) => u.unit);
  assert.deepEqual(order(["B1", "A1"]), ["B", "A", "C"]);
  assert.deepEqual(order(["A1", "B1"]), ["A", "B", "C"]);
  assert.deepEqual(order([]), ["A", "B", "C"]);
});
