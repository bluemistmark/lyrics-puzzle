import { test } from "node:test";
import assert from "node:assert/strict";
import * as api from "./difficulty.ts";

process.env.SUPABASE_URL = "https://db.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";

type Call = {
  url: string;
  prefer: string;
  body: Record<string, unknown>;
};
let calls: Call[] = [];
/** Every test installs its own fake fetch: test files share one process (--test-isolation=none). */
function mockFetch(respond: (call: Call) => Response) {
  calls = [];
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    const headers = (init.headers ?? {}) as Record<string, string>;
    const call = {
      url,
      prefer: headers.prefer ?? "",
      body: init.body ? JSON.parse(init.body as string) : {},
    };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
}
const token = "b".repeat(43);
const valid = {
  token,
  questionId: "NCT_0001",
  rating: "hard",
  solved: false,
  mode: "play",
};
const post = (body: object) =>
  api.POST(
    new Request("https://game.test/api/difficulty", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

test("체감 난이도는 플레이어를 만든 뒤 문제별 한 표로 병합 저장", async () => {
  mockFetch(() => new Response("", { status: 201 }));
  const response = await post(valid);
  assert.equal(response.status, 200);
  assert.deepEqual(
    calls.map((c) => [c.url, c.prefer]),
    [
      [
        "https://db.test/rest/v1/players?on_conflict=id",
        "resolution=ignore-duplicates",
      ],
      [
        "https://db.test/rest/v1/difficulty_votes?on_conflict=question_id,player_id",
        "resolution=merge-duplicates",
      ],
    ],
  );
  assert.deepEqual(calls[1].body, {
    question_id: "NCT_0001",
    player_id: calls[0].body.id,
    rating: "hard",
    solved: false,
    mode: "play",
  });
  assert.match(calls[0].body.id as string, /^[0-9a-f]{64}$/);
});

test("잘못된 응답 값은 DB에 보내지 않고 거절", async () => {
  mockFetch(() => new Response("", { status: 201 }));
  for (const change of [
    { token: "x" },
    { questionId: "" },
    { questionId: "a/b" },
    { rating: "매우 어려움" },
    { solved: "no" },
    { mode: "weekly" },
  ])
    assert.equal(
      (await post({ ...valid, ...change })).status,
      400,
      JSON.stringify(change),
    );
  assert.equal(calls.length, 0);
});

test("DB에 없는 문제 ID는 400으로 안내", async () => {
  mockFetch((call) =>
    call.url.includes("difficulty_votes")
      ? new Response('{"code":"23503"}', { status: 409 })
      : new Response("", { status: 201 }),
  );
  const response = await post(valid);
  assert.equal(response.status, 400);
  assert.match(
    ((await response.json()) as { error: string }).error,
    /없는 문제/,
  );
});
