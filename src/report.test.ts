import { test } from "node:test";
import assert from "node:assert/strict";
import "./testing/fake-storage.ts";

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
const { REPORT_KINDS, QUESTION_KINDS, GENERAL_KINDS, sendReport } =
  await import("./report.ts");
const { useRanking } = await import("./ranking.ts");
const api = await import("../api/report.ts");

test("게임과 API는 같은 제보 종류를 쓰고, 화면별 종류는 그 안에 있음", () => {
  const kinds = REPORT_KINDS.map(([kind]) => kind);
  assert.deepEqual(kinds, api.REPORT_KINDS);
  assert.ok(
    [...QUESTION_KINDS, ...GENERAL_KINDS].every((k) => kinds.includes(k)),
  );
});

test("제보는 익명 토큰과 함께 보내고, 빈 내용은 보내지 않음", async () => {
  useRanking.setState({ token: "" });
  mockFetch(() => new Response('{"ok":true}'));
  await assert.rejects(sendReport({ kind: "other", message: "  " }), /내용/);
  assert.equal(calls.length, 0);
  await sendReport({
    kind: "answer",
    message: "인정 안 돼요",
    questionId: "Q1",
    mode: "play",
  });
  assert.equal(calls[0].url, "/api/report");
  assert.deepEqual(calls[0].body, {
    token: useRanking.getState().token,
    kind: "answer",
    message: "인정 안 돼요",
    questionId: "Q1",
    mode: "play",
  });
  assert.match(useRanking.getState().token, /^[A-Za-z0-9_-]{43}$/);
  useRanking.setState({ token: "" });
});

test("서버가 거절하면 그 이유를 그대로 보여 줌", async () => {
  mockFetch(
    () =>
      new Response(
        '{"error":"제보가 너무 많아요. 잠시 후 다시 보내 주세요."}',
        { status: 429 },
      ),
  );
  await assert.rejects(
    sendReport({ kind: "bug", message: "버그" }),
    /너무 많아요/,
  );
});
