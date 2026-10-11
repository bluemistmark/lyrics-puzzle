import { test } from "node:test";
import assert from "node:assert/strict";
import { formatHash, parseHash } from "./route.ts";

test("해시에서 탭과 필터를 읽고 다시 같은 해시로 쓴다", () => {
  const route = parseHash(
    "#questions?song=D_012&q=%EC%82%AC%EB%9E%91+%ED%95%B4",
  );
  assert.deepEqual(route, {
    tab: "questions",
    params: { song: "D_012", q: "사랑 해" },
  });
  assert.deepEqual(parseHash(formatHash(route)), route);
});

test("빈 해시와 필터 없는 탭, 빈 필터는 URL에서 빠진다", () => {
  assert.deepEqual(parseHash(""), { tab: "", params: {} });
  assert.deepEqual(parseHash("#songs"), { tab: "songs", params: {} });
  assert.equal(
    formatHash({ tab: "songs", params: { artist: "", q: "a" } }),
    "#songs?q=a",
  );
  assert.equal(formatHash({ tab: "reports", params: {} }), "#reports");
});
