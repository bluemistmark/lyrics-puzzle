import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowed } from "../../api/lookup.ts";
import { DEEZER_API, itunesUrls, queryUrl } from "../../src/data/artwork.ts";

test("앨범 찾기 프록시: 어드민이 만드는 Deezer·iTunes 주소만 허용", () => {
  const song = {
    artist: "NCT DREAM",
    title: "버퍼링 (Glitch Mode)",
    aliases: [],
  };
  assert.ok(isAllowed(queryUrl({ kind: "track", q: "NCT DREAM 버퍼링" }, 25)));
  assert.ok(isAllowed(queryUrl({ kind: "album", q: "NCT DREAM Glitch" })));
  assert.ok(isAllowed(`${DEEZER_API}/album/305127287`));
  for (const url of itunesUrls(song)) assert.ok(isAllowed(url));

  assert.equal(isAllowed("https://api.deezer.com/user/1"), false);
  assert.equal(isAllowed("https://api.deezer.com/album/1/../user"), false);
  assert.equal(
    isAllowed("https://example.com/?https://api.deezer.com/search?q=a"),
    false,
  );
  assert.equal(isAllowed("http://api.deezer.com/search?q=a"), false);
  assert.equal(isAllowed(42), false);
});
