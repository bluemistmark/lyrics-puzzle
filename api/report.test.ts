import { test } from "node:test";
import assert from "node:assert/strict";
import * as api from "./report.ts";

process.env.SUPABASE_URL = "https://db.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";

type Call = { url: string; method: string; body: Record<string, unknown> };
let calls: Call[] = [];
/** Every test installs its own fake fetch: test files share one process (--test-isolation=none). */
function mockFetch(respond: (call: Call) => Response) {
  calls = [];
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    const call = {
      url,
      method: init.method ?? "GET",
      body: init.body ? JSON.parse(init.body as string) : {},
    };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
}
const token = "d".repeat(43);
const post = (body: object) =>
  api.POST(
    new Request("https://game.test/api/report", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
const errorOf = async (response: Response) =>
  ((await response.json()) as { error: string }).error;
const recentCount = (n: number) => (call: Call) =>
  call.method === "GET"
    ? new Response(
        JSON.stringify(Array.from({ length: n }, (_, id) => ({ id }))),
      )
    : new Response("", { status: 201 });

test("문제 화면의 제보는 문제 ID·모드와 함께, 정리한 내용으로 저장", async () => {
  mockFetch(recentCount(0));
  const response = await post({
    token,
    kind: "lyrics",
    message: "  두 번째 줄 \u0007오타\n\n\n\n있어요  ",
    questionId: "NCT_0001",
    mode: "daily",
  });
  assert.equal(response.status, 200);
  assert.match(
    calls[0].url,
    /\/rest\/v1\/reports\?select=id&player_id=eq\.[0-9a-f]{64}&created_at=gte\./,
  );
  assert.deepEqual(calls[1].body, {
    kind: "lyrics",
    message: "두 번째 줄 오타\n\n있어요",
    question_id: "NCT_0001",
    mode: "daily",
    player_id: (calls[0].url.match(/eq\.([0-9a-f]{64})/) ?? [])[1],
  });
});

test("설정에서 보낸 일반 제보는 문제 정보 없이 저장", async () => {
  mockFetch(recentCount(0));
  assert.equal(
    (await post({ token, kind: "bug", message: "버튼이 안 눌려요" })).status,
    200,
  );
  assert.equal(calls[1].body.question_id, null);
  assert.equal(calls[1].body.mode, null);
});

test("잘못된 제보는 DB에 보내지 않고 이유를 알려 줌", async () => {
  mockFetch(recentCount(0));
  const valid = { token, kind: "other", message: "의견" };
  for (const [change, reason] of [
    [{ token: "x" }, /플레이어/],
    [{ kind: "spam" }, /종류/],
    [{ message: "   " }, /내용을 적어/],
    [{ message: "가".repeat(api.MESSAGE_MAX + 1) }, /1000자/],
    [{ questionId: "a/b" }, /형식/],
    [{ mode: "weekly" }, /형식/],
  ] as const) {
    const response = await post({ ...valid, ...change });
    assert.equal(response.status, 400, JSON.stringify(change));
    assert.match(await errorOf(response), reason);
  }
  assert.equal(calls.length, 0);
});

test("짧은 시간에 너무 많이 보내면 저장하지 않음", async () => {
  mockFetch(recentCount(5));
  const response = await post({ token, kind: "other", message: "또 보내요" });
  assert.equal(response.status, 429);
  assert.equal(calls.length, 1);
});
