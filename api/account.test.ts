import { test } from "node:test";
import assert from "node:assert/strict";
import * as api from "./account.ts";

process.env.SUPABASE_URL = "https://db.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";

type Call = { url: string; method: string; auth: string };
let calls: Call[] = [];
/** Every test installs its own fake fetch: test files share one process (--test-isolation=none). */
function mockFetch(respond: (call: Call) => Response) {
  calls = [];
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    const headers = (init.headers ?? {}) as Record<string, string>;
    const call = {
      url,
      method: init.method ?? "GET",
      auth: headers.authorization ?? "",
    };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
}
const remove = (headers: Record<string, string>, body?: object) =>
  api.DELETE(
    new Request("https://game.test/api/account", {
      method: "DELETE",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
const user = () => new Response('{"id":"user-1"}');

test("탈퇴는 로그인한 사용자를 확인한 뒤 랭킹 플레이어와 계정을 지움", async () => {
  mockFetch((call) =>
    call.url.endsWith("/auth/v1/user")
      ? user()
      : new Response(null, { status: 204 }),
  );
  const response = await remove(
    { authorization: "Bearer user-jwt" },
    { token: "c".repeat(43) },
  );
  assert.equal(response.status, 200);
  assert.equal(calls[0].url, "https://db.test/auth/v1/user");
  assert.equal(calls[0].auth, "Bearer user-jwt");
  assert.match(calls[1].url, /\/rest\/v1\/players\?id=eq\.[0-9a-f]{64}$/);
  assert.equal(calls[1].method, "DELETE");
  assert.equal(calls[2].url, "https://db.test/auth/v1/admin/users/user-1");
  assert.equal(calls[2].auth, "Bearer service-key");
});

test("랭킹 토큰이 없으면 계정만 지움", async () => {
  mockFetch((call) =>
    call.url.endsWith("/auth/v1/user")
      ? user()
      : new Response(null, { status: 204 }),
  );
  assert.equal(
    (await remove({ authorization: "Bearer user-jwt" })).status,
    200,
  );
  assert.deepEqual(
    calls.map((c) => c.url),
    [
      "https://db.test/auth/v1/user",
      "https://db.test/auth/v1/admin/users/user-1",
    ],
  );
});

test("로그인하지 않았거나 세션이 만료되면 아무것도 지우지 않음", async () => {
  mockFetch(() => new Response("", { status: 401 }));
  assert.equal((await remove({})).status, 401);
  assert.equal(calls.length, 0);
  assert.equal((await remove({ authorization: "Bearer old" })).status, 401);
  assert.equal(calls.length, 1);
});
