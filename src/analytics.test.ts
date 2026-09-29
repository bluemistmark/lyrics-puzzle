import { test } from "node:test";
import assert from "node:assert/strict";
import { beforeSend, redactUrl } from "./analytics.ts";

test("방문 통계로 보내는 주소에서 로그인 코드 등 쿼리와 해시를 지우고 오늘의 문제 표시만 남김", () => {
  assert.equal(
    redactUrl("https://nct-lyrics.vercel.app/?code=secret&state=x#frag"),
    "https://nct-lyrics.vercel.app/",
  );
  assert.equal(
    redactUrl(
      "https://nct-lyrics.vercel.app/?today=1&error_description=denied",
    ),
    "https://nct-lyrics.vercel.app/?today=1",
  );
  assert.equal(
    redactUrl("https://nct-lyrics.vercel.app/privacy.html"),
    "https://nct-lyrics.vercel.app/privacy.html",
  );
  assert.deepEqual(
    beforeSend({ type: "pageview", url: "https://a.test/?code=1" }),
    { type: "pageview", url: "https://a.test/" },
  );
});
