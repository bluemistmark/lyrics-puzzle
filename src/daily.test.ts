import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dailyQuestionId,
  dailyResultText,
  dailySummary,
  koreaDate,
} from "./daily.ts";

test("한국 날짜 경계에서 오늘의 문제가 바뀜", () => {
  assert.equal(koreaDate(new Date("2026-09-28T14:59:59Z")), "2026-09-28");
  assert.equal(koreaDate(new Date("2026-09-28T15:00:00Z")), "2026-09-29");
});

test("같은 날짜와 문제 목록은 표시 순서와 관계없이 같은 문제를 고름", () => {
  const ids = ["Q-2", "Q-1", "Q-3"];
  assert.equal(
    dailyQuestionId("2026-09-29", ids),
    dailyQuestionId("2026-09-29", [...ids].reverse()),
  );
  assert.ok(ids.includes(dailyQuestionId("2026-09-29", ids)));
});

test("공유 결과에 정답이나 가사가 들어가지 않음", () => {
  const text = dailyResultText({
    date: "2026-09-29",
    solved: true,
    givenUp: false,
    percent: 72,
    guesses: 5,
    hints: 1,
  });
  assert.match(text, /2026\.09\.29/);
  assert.match(text, /가사 복원 72% · 단어 5번 · 힌트 1번/);
  assert.match(text, /제목 정답/);
});

test("연속 정답은 2일 이상일 때만 공유 결과에 표시", () => {
  const base = {
    date: "2026-09-29",
    solved: true,
    givenUp: false,
    percent: 50,
    guesses: 3,
    hints: 0,
  };
  assert.doesNotMatch(dailyResultText({ ...base, streak: 1 }), /연속/);
  assert.match(dailyResultText({ ...base, streak: 3 }), /🔥 3일 연속 정답/);
  assert.doesNotMatch(
    dailyResultText({ ...base, solved: false, givenUp: true, streak: 3 }),
    /연속/,
  );
});

const win = (guesses: number) => ({ solved: true, guesses, hints: 0 });
const loss = { solved: false, guesses: 4, hints: 1 };

test("오늘의 문제 요약은 참여·정답·정답한 날의 평균 입력 수를 세고 미래 날짜는 무시", () => {
  const summary = dailySummary(
    {
      "2026-09-25": win(0),
      "2026-09-26": loss,
      "2026-09-27": win(5),
      "2026-09-28": win(12),
      "2026-09-30": win(1),
    },
    "2026-09-29",
  );
  assert.equal(summary.played, 4);
  assert.equal(summary.solved, 3);
  // (0 + 5 + 12) / 3 = 5.67 → 5.7; the given-up day doesn't count.
  assert.equal(summary.average, 5.7);
  assert.equal(
    dailySummary({ "2026-09-29": loss }, "2026-09-29").average,
    null,
  );
});

test("현재 연속 정답은 오늘을 아직 안 풀었으면 어제까지 이어지고, 포기나 빠진 날에 끊김", () => {
  const history = {
    "2026-09-24": win(1),
    "2026-09-25": win(1),
    "2026-09-26": win(1),
    "2026-09-28": win(1),
    "2026-09-29": win(1),
  };
  assert.deepEqual(
    [
      dailySummary(history, "2026-09-29").current,
      dailySummary(history, "2026-09-29").best,
    ],
    [2, 3],
  );
  assert.equal(dailySummary(history, "2026-09-30").current, 2);
  assert.equal(dailySummary(history, "2026-10-01").current, 0);
  assert.equal(
    dailySummary({ ...history, "2026-09-30": loss }, "2026-09-30").current,
    0,
  );
  assert.equal(
    dailySummary({ "2026-02-28": win(1), "2026-03-01": win(1) }, "2026-03-01")
      .best,
    2,
  );
});
