import "../../src/testing/fake-storage.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { clientAddress, parseIds } from "../../api/achievements.ts";
import { ACHIEVEMENTS } from "../../src/store.ts";

test("업적 달성 전송: 게임의 모든 업적 ID를 받아들임", () => {
  assert.deepEqual(
    parseIds(ACHIEVEMENTS.map((a) => a.id)),
    ACHIEVEMENTS.map((a) => a.id),
  );
  assert.deepEqual(parseIds(["collect-NCT 127", "solve-300"]), [
    "collect-NCT 127",
    "solve-300",
  ]);
});

test("요청 수 제한: 접속 주소는 x-real-ip, 없으면 x-forwarded-for의 첫 값", () => {
  assert.equal(
    clientAddress(
      new Headers({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" }),
    ),
    "1.2.3.4",
  );
  assert.equal(
    clientAddress(new Headers({ "x-forwarded-for": " 5.6.7.8 , 10.0.0.1" })),
    "5.6.7.8",
  );
  assert.equal(clientAddress(new Headers()), "");
});

test("업적 달성 전송: 빈 목록·너무 많은 목록·이상한 ID는 거절", () => {
  assert.equal(parseIds([]), null);
  assert.equal(parseIds("solve-1"), null);
  assert.equal(parseIds(Array.from({ length: 301 }, (_, i) => `a${i}`)), null);
  assert.equal(parseIds(["<script>"]), null);
  assert.equal(parseIds(["a".repeat(81)]), null);
  assert.equal(parseIds([1]), null);
});
