import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarWeeks, playLevel, shiftDate } from "./calendar.ts";

test("날짜 이동은 월말과 윤년을 넘어감", () => {
  assert.equal(shiftDate("2026-03-01", -1), "2026-02-28");
  assert.equal(shiftDate("2028-02-28", 1), "2028-02-29");
  assert.equal(shiftDate("2026-12-31", 1), "2027-01-01");
});

test("잔디는 일요일부터 한 주씩, 마지막 주에 오늘이 오고 이후는 미래로 표시", () => {
  // 2026-09-29 is a Tuesday.
  const weeks = calendarWeeks("2026-09-29", 2);
  assert.equal(weeks.length, 2);
  assert.equal(weeks[0][0].date, "2026-09-20");
  assert.deepEqual(
    weeks[1].map((d) => d.future),
    [false, false, false, true, true, true, true],
  );
  assert.equal(weeks[1][2].date, "2026-09-29");
  assert.equal(weeks[1][6].date, "2026-10-03");
});

test("잔디 진하기는 그날 끝낸 문제 수에 따라 0~4단계", () => {
  assert.deepEqual(
    [0, 1, 2, 3, 5, 6, 9, 10, 40].map(playLevel),
    [0, 1, 1, 2, 2, 3, 3, 4, 4],
  );
});
