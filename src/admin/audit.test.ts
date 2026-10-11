import { test } from "node:test";
import assert from "node:assert/strict";
import { auditChanges, formatValue } from "./audit.ts";

test("수정은 바뀐 칸만 한국어 이름으로, updated_at은 무시", () => {
  assert.deepEqual(
    auditChanges(
      { id: "Q1", lines: ["가", "나"], active: true, updated_at: "1" },
      { id: "Q1", lines: ["가", "다"], active: false, updated_at: "2" },
    ),
    [
      { field: "가사", before: "가 / 나", after: "가 / 다" },
      { field: "출제 사용", before: "예", after: "아니오" },
    ],
  );
});

test("추가와 삭제는 빈 값과 비교하고, 모르는 칸은 이름 그대로", () => {
  assert.deepEqual(auditChanges(null, { english: "City", extra: 1 }), [
    { field: "영어", before: "", after: "City" },
    { field: "extra", before: "", after: "1" },
  ]);
  assert.deepEqual(auditChanges({ name: "A", aliases: [] }, null), [
    { field: "가수명", before: "A", after: "" },
  ]);
  assert.equal(formatValue(null), "");
});
