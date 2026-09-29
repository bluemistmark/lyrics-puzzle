import { test } from "node:test";
import assert from "node:assert/strict";
import * as api from "./ranking.ts";
import * as client from "../src/nickname.ts";

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
const created = () => new Response("", { status: 201 });

const token = "a".repeat(43);
const koreaDate = (offset = 0) =>
  new Date(Date.now() + 9 * 3600e3 + offset * 86400e3)
    .toISOString()
    .slice(0, 10);
const send = (method: "POST" | "PUT", body: object) =>
  api[method](
    new Request("https://game.test/api/ranking", {
      method,
      body: JSON.stringify(body),
    }),
  );
const errorOf = async (response: Response) =>
  ((await response.json()) as { error: string }).error;

test("랭킹 API와 게임은 같은 닉네임 규칙을 씀", () => {
  const samples = [
    "",
    " a ",
    "시즈니",
    "  NCT   127  ",
    "ㅋㅋㅋ",
    "x".repeat(13),
    "a<b>",
    "도재정_1",
  ];
  for (const raw of samples) {
    assert.equal(api.normalizeNickname(raw), client.normalizeNickname(raw));
    const name = client.normalizeNickname(raw);
    assert.equal(api.nicknameError(name), client.nicknameError(name), raw);
  }
  assert.equal(client.nicknameError("시즈니"), null);
  assert.ok(client.nicknameError("ㅋㅋㅋ"));
});

test("오늘 결과 제출은 토큰 해시로 플레이어를 만들고 하루 첫 결과만 저장", async () => {
  mockFetch(created);
  const response = await send("POST", {
    token,
    date: koreaDate(),
    solved: true,
    guesses: 4,
    hints: 1,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(
    calls.map((c) => c.url),
    [
      "https://db.test/rest/v1/players?on_conflict=id",
      "https://db.test/rest/v1/daily_scores?on_conflict=date,player_id",
    ],
  );
  const id = calls[0].body.id as string;
  assert.match(id, /^[0-9a-f]{64}$/);
  assert.deepEqual(calls[1].body, {
    date: koreaDate(),
    player_id: id,
    solved: true,
    guesses: 4,
    hints: 1,
  });
});

test("지난 날짜·잘못된 토큰·범위를 벗어난 결과는 거절", async () => {
  mockFetch(created);
  const valid = {
    token,
    date: koreaDate(),
    solved: true,
    guesses: 1,
    hints: 0,
  };
  for (const change of [
    { date: koreaDate(-2) },
    { token: "short" },
    { guesses: -1 },
    { hints: 1.5 },
    { solved: "yes" },
  ])
    assert.equal(
      (await send("POST", { ...valid, ...change })).status,
      400,
      JSON.stringify(change),
    );
  assert.equal(calls.length, 0);
});

test("닉네임 변경은 정리한 이름으로 병합 저장하고 규칙 위반은 거절", async () => {
  mockFetch(created);
  const bad = await send("PUT", { token, nickname: "a" });
  assert.equal(bad.status, 400);
  assert.match(await errorOf(bad), /2~12자/);
  const ok = await send("PUT", { token, nickname: "  시즈니   1 " });
  assert.equal(ok.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.nickname, "시즈니 1");
});

test("랭킹 조회는 토큰이 있으면 내 순위를 위해 해시를 넘기고 없으면 빈 값", async () => {
  const board = { participants: 3, solved: 2, entries: [], me: null };
  mockFetch(() => new Response(JSON.stringify(board)));
  const withToken = await api.GET(
    new Request(`https://game.test/api/ranking?date=${koreaDate()}`, {
      headers: { "x-ranking-token": token },
    }),
  );
  assert.deepEqual(await withToken.json(), board);
  assert.equal(calls[0].url, "https://db.test/rest/v1/rpc/daily_ranking");
  assert.match(calls[0].body.p_player as string, /^[0-9a-f]{64}$/);
  await api.GET(new Request("https://game.test/api/ranking"));
  assert.equal(calls[1].body.p_player, "");
  assert.equal(calls[1].body.p_date, koreaDate());
  const bad = await api.GET(
    new Request("https://game.test/api/ranking?date=x"),
  );
  assert.equal(bad.status, 400);
});

test("DB 오류나 환경 변수 누락은 한국어 안내로 응답", async () => {
  mockFetch(() => new Response("", { status: 404 }));
  const failed = await send("PUT", { token, nickname: "시즈니" });
  assert.equal(failed.status, 502);
  assert.match(await errorOf(failed), /마이그레이션/);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const missing = await api.GET(new Request("https://game.test/api/ranking"));
  process.env.SUPABASE_SERVICE_ROLE_KEY = key;
  assert.equal(missing.status, 500);
  assert.match(await errorOf(missing), /SUPABASE_SERVICE_ROLE_KEY/);
});
