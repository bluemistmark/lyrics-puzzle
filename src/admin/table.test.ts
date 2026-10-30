import { test } from "node:test";
import assert from "node:assert/strict";
import {
  byCode,
  byText,
  formatSort,
  initials,
  matchesQuery,
  parseSort,
  sortRows,
  toggleSort,
} from "./table.ts";

test("검색은 대소문자 구분 없이 부분 일치하고, 초성만 입력하면 한글을 초성으로 찾음", () => {
  assert.equal(initials("사랑해 Baby"), "ㅅㄹㅎ Baby");
  assert.ok(matchesQuery(["Baggy Jeans"], "baggy"));
  assert.ok(matchesQuery(["", undefined, "영웅"], "영"));
  assert.ok(matchesQuery(["너의 마음을"], "ㄴㅇㅁ"));
  assert.ok(matchesQuery(["너의 마음을"], "ㅁㅇ ㅇ"));
  assert.ok(!matchesQuery(["너의 마음을"], "ㅅㄹ"));
  // 초성과 다른 글자가 섞이면 그대로 부분 일치로만 찾는다.
  assert.ok(!matchesQuery(["너의 마음을"], "ㄴ의"));
  assert.ok(matchesQuery(["anything"], "  "));
});

test("정렬은 URL 값으로 읽고 쓰며, 같은 열을 누르면 방향이 바뀌고 다른 열은 기본 방향으로 시작", () => {
  const keys = ["id", "title", "updated"] as const;
  const fallback = { key: "id" as const, desc: false };
  assert.deepEqual(parseSort("-title", keys, fallback), {
    key: "title",
    desc: true,
  });
  assert.deepEqual(parseSort("title", keys, fallback), {
    key: "title",
    desc: false,
  });
  assert.deepEqual(parseSort("nope", keys, fallback), fallback);
  assert.equal(formatSort({ key: "title", desc: true }), "-title");
  assert.deepEqual(toggleSort(fallback, "id"), { key: "id", desc: true });
  assert.deepEqual(toggleSort(fallback, "updated", true), {
    key: "updated",
    desc: true,
  });
});

test("정렬 기준이 같은 행은 원래 순서를 유지", () => {
  const rows = [
    { id: "a", n: 1 },
    { id: "b", n: 0 },
    { id: "c", n: 1 },
  ];
  const byN = (x: { n: number }, y: { n: number }) => x.n - y.n;
  assert.deepEqual(
    sortRows(rows, byN, false).map((r) => r.id),
    ["b", "a", "c"],
  );
  assert.deepEqual(
    sortRows(rows, byN, true).map((r) => r.id),
    ["a", "c", "b"],
  );
  assert.ok(byText("가", "나") < 0);
  assert.ok(byCode(undefined, "2026-10-16") < 0);
});
