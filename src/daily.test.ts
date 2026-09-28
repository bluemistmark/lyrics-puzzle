import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyQuestionId, dailyResultText, koreaDate } from "./daily.ts";

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
