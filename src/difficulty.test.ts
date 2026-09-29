import { test } from "node:test";
import assert from "node:assert/strict";

const memory = new Map<string, string>();
const storage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => memory.set(k, v),
  removeItem: (k: string) => memory.delete(k),
};
Object.defineProperty(globalThis, "localStorage", {
  value: storage,
  configurable: true,
});
Object.defineProperty(globalThis, "window", {
  value: { localStorage: storage },
  configurable: true,
});
type Call = { url: string; body: Record<string, unknown> };
let calls: Call[] = [];
/** Every test installs its own fake fetch: test files share one process (--test-isolation=none). */
function mockFetch(respond: () => Response) {
  calls = [];
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url, body: JSON.parse(init.body as string) });
    return respond();
  }) as typeof fetch;
}
const { useDifficulty, RATINGS } = await import("./difficulty.ts");
const { useRanking } = await import("./ranking.ts");
const api = await import("../api/difficulty.ts");
const context = { solved: true, mode: "daily" as const };

test("게임과 API는 같은 체감 난이도 값을 씀", () => {
  assert.deepEqual(
    RATINGS.map(([rating]) => rating),
    api.RATINGS,
  );
});

test("응답은 익명 토큰과 함께 보내고, 같은 답은 다시 보내지 않으며 바꾸면 다시 보냄", async () => {
  useDifficulty.setState({ votes: {} });
  mockFetch(() => new Response('{"ok":true}'));
  await useDifficulty.getState().vote("Q1", "easy", context);
  assert.equal(calls[0].url, "/api/difficulty");
  assert.deepEqual(calls[0].body, {
    token: useRanking.getState().token,
    questionId: "Q1",
    rating: "easy",
    solved: true,
    mode: "daily",
  });
  assert.match(useRanking.getState().token, /^[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(useDifficulty.getState().votes, { Q1: "easy" });
  await useDifficulty.getState().vote("Q1", "easy", context);
  assert.equal(calls.length, 1);
  await useDifficulty.getState().vote("Q1", "hard", context);
  assert.equal(calls.length, 2);
  assert.deepEqual(useDifficulty.getState().votes, { Q1: "hard" });
});

test("저장에 실패하면 이전 응답으로 되돌리고 오류를 던짐", async () => {
  useDifficulty.setState({ votes: { Q1: "normal" } });
  mockFetch(() => new Response('{"error":"없는 문제예요."}', { status: 400 }));
  await assert.rejects(
    useDifficulty.getState().vote("Q1", "hard", context),
    /없는 문제/,
  );
  assert.deepEqual(useDifficulty.getState().votes, { Q1: "normal" });
  mockFetch(() => {
    throw TypeError("offline");
  });
  await assert.rejects(
    useDifficulty.getState().vote("Q2", "easy", context),
    /연결할 수 없어요/,
  );
  assert.deepEqual(useDifficulty.getState().votes, { Q1: "normal" });
});
