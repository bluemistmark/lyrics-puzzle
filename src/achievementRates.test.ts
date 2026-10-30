import "./testing/fake-storage.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { MIN_PLAYERS, rateLabel } from "./achievementRates.ts";

test("업적 달성률: 플레이어가 적으면 숨기고, 1% 미만·0명은 따로 말함", () => {
  const rates = (total: number, n: number) => ({ total, counts: { a: n } });
  assert.equal(rateLabel(null, "a"), null);
  assert.equal(rateLabel(rates(MIN_PLAYERS - 1, 5), "a"), null);
  assert.equal(rateLabel(rates(200, 25), "a"), "플레이어의 13%가 달성");
  assert.equal(rateLabel(rates(1000, 3), "a"), "플레이어의 1% 미만이 달성");
  assert.equal(rateLabel(rates(200, 0), "a"), "아직 달성한 플레이어가 없어요");
  assert.equal(rateLabel(rates(200, 5), "b"), "아직 달성한 플레이어가 없어요");
});
