import { test } from "node:test";
import assert from "node:assert/strict";
import { fillDays, shiftDate, solveRate, unitCounts } from "./dashboard.ts";

test("날짜 이동은 월·연도 경계를 넘어도 정확함", () => {
  assert.equal(shiftDate("2026-03-01", -1), "2026-02-28");
  assert.equal(shiftDate("2026-12-31", 1), "2027-01-01");
});

test("최근 N일을 오래된 날부터 채우고 기록 없는 날은 0으로 둠", () => {
  const days = fillDays(
    [
      {
        date: "2026-09-29",
        participants: 4,
        solved: 3,
        avg_hints: 1,
        avg_guesses: 5,
      },
      {
        date: "2026-09-01",
        participants: 9,
        solved: 9,
        avg_hints: 0,
        avg_guesses: 2,
      },
    ],
    "2026-09-29",
    3,
  );
  assert.deepEqual(
    days.map((d) => [d.date, d.participants]),
    [
      ["2026-09-27", 0],
      ["2026-09-28", 0],
      ["2026-09-29", 4],
    ],
  );
  assert.equal(solveRate(days[2]), 75);
  assert.equal(solveRate(days[0]), null);
});

test("유닛별 곡·문제 수는 catalog의 유닛 순서를 따름", () => {
  const counts = unitCounts({
    songs: [
      { id: "b1", artist: "B", unit: "B", title: "b", aliases: [] },
      { id: "a1", artist: "A", unit: "A", title: "a", aliases: [] },
      { id: "b2", artist: "B", unit: "B", title: "c", aliases: [] },
    ],
    questions: [
      { id: "q1", songId: "b1", lines: [] },
      { id: "q2", songId: "b2", lines: [] },
      { id: "q3", songId: "a1", lines: [] },
      { id: "q4", songId: "b1", lines: [] },
    ],
    dictionary: [],
  });
  assert.deepEqual(counts, [
    { unit: "B", songs: 2, questions: 3 },
    { unit: "A", songs: 1, questions: 1 },
  ]);
});
