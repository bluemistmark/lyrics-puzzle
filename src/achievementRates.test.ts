import "./testing/fake-storage.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { isRare, MIN_PLAYERS, rateLabel } from "./achievementRates.ts";

test("업적 달성률: 플레이어가 적으면 숨기고, 1% 미만·0명은 따로 말함", () => {
  const rates = (total: number, n: number) => ({ total, counts: { a: n } });
  assert.equal(rateLabel(null, "a"), null);
  assert.equal(rateLabel(rates(MIN_PLAYERS - 1, 5), "a"), null);
  assert.equal(rateLabel(rates(200, 25), "a"), "플레이어의 13%가 달성");
  assert.equal(rateLabel(rates(1000, 3), "a"), "플레이어의 1% 미만이 달성");
  assert.equal(rateLabel(rates(200, 0), "a"), "아직 달성한 플레이어가 없어요");
  assert.equal(rateLabel(rates(200, 5), "b"), "아직 달성한 플레이어가 없어요");
});

test("희귀 업적: 누군가 달성했지만 5% 미만, 플레이어가 적으면 표시 안 함", () => {
  const rates = (total: number, n: number) => ({ total, counts: { a: n } });
  assert.equal(isRare(rates(100, 4), "a"), true);
  assert.equal(isRare(rates(100, 5), "a"), false);
  assert.equal(isRare(rates(100, 0), "a"), false);
  assert.equal(isRare(rates(MIN_PLAYERS - 1, 0), "a"), false);
  assert.equal(isRare(null, "a"), false);
});
