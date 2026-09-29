import { test } from "node:test";
import assert from "node:assert/strict";
import "./testing/fake-storage.ts";

type Call = { url: string; init: RequestInit };
let calls: Call[] = [];
/** Every test installs its own fake fetch: test files share one process (--test-isolation=none). */
function mockFetch(respond: () => Response) {
  calls = [];
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    return respond();
  }) as typeof fetch;
}
const { useRanking } = await import("./ranking.ts");
const body = (call: Call) => JSON.parse(call.init.body as string);
const ok = () => new Response('{"ok":true}');
const result = { date: "2026-09-29", solved: true, guesses: 3, hints: 0 };

test("랭킹 조회는 토큰이 없으면 만들지 않고, 첫 제출 때 토큰을 만들어 저장", async () => {
  // Other test files share this store in the same process.
  useRanking.setState({ token: "", submitted: "", nickname: "", asked: false });
  const board = { participants: 0, solved: 0, entries: [], me: null };
  mockFetch(() => new Response(JSON.stringify(board)));
  assert.deepEqual(await useRanking.getState().load("2026-09-29"), board);
  assert.equal(calls[0].url, "/api/ranking?date=2026-09-29");
  assert.deepEqual(calls[0].init.headers, {});
  assert.equal(useRanking.getState().token, "");

  mockFetch(ok);
  await useRanking.getState().submit(result);
  const token = useRanking.getState().token;
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(body(calls[0]), { token, ...result });
  assert.equal(useRanking.getState().submitted, "2026-09-29");
  // Read through the store's own storage: whichever test file created it first owns it.
  const saved = await useRanking.persist
    .getOptions()
    .storage!.getItem("lyrics-ranking-v1");
  assert.equal((saved!.state as { token: string }).token, token);

  await useRanking.getState().submit(result);
  assert.equal(calls.length, 1, "같은 날은 다시 보내지 않음");
});

test("제출이 실패하면 서버 메시지를 던지고 다음에 다시 보낼 수 있음", async () => {
  useRanking.setState({ submitted: "" });
  mockFetch(
    () =>
      new Response('{"error":"오늘의 문제 결과만 등록할 수 있어요."}', {
        status: 400,
      }),
  );
  await assert.rejects(useRanking.getState().submit(result), /오늘의 문제/);
  assert.equal(useRanking.getState().submitted, "");
  mockFetch(() => {
    throw TypeError("offline");
  });
  await assert.rejects(
    useRanking.getState().submit(result),
    /연결할 수 없어요/,
  );
});

test("닉네임은 규칙을 먼저 검사하고, 저장하면 다시 묻지 않고 랭킹을 새로 불러옴", async () => {
  mockFetch(ok);
  await assert.rejects(useRanking.getState().saveNickname(" a "), /2~12자/);
  assert.equal(calls.length, 0);
  const version = useRanking.getState().version;
  await useRanking.getState().saveNickname("  시즈니  ");
  assert.equal(calls[0].init.method, "PUT");
  assert.equal(body(calls[0]).nickname, "시즈니");
  assert.equal(useRanking.getState().nickname, "시즈니");
  assert.equal(useRanking.getState().asked, true);
  assert.equal(useRanking.getState().version, version + 1);
  await useRanking.getState().load("2026-09-29");
  assert.deepEqual(calls[1].init.headers, {
    "x-ranking-token": useRanking.getState().token,
  });
});
