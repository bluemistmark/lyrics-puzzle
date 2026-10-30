import { test } from "node:test";
import assert from "node:assert/strict";
import { albumIssues } from "./album-issues.ts";
import type { AlbumRow } from "../data/build-catalog.ts";

const album = (over: Partial<AlbumRow>): AlbumRow => ({
  id: 1,
  title: "Cherry Bomb - The 3rd Mini Album",
  artist: "NCT 127",
  kind: "ep",
  released_on: "2017-06-14",
  cover_url: "c",
  external_id: "",
  ...over,
});
const title = { title_track: true };
const bSide = { title_track: false };

test("앨범 확인: 타이틀곡 없음·여러 곡, 커버·발매일 없음", () => {
  assert.deepEqual(albumIssues(album({}), [title, bSide], []), []);
  assert.deepEqual(albumIssues(album({}), [bSide], []), ["타이틀곡 없음"]);
  assert.deepEqual(albumIssues(album({}), [title, title], []), [
    "타이틀곡 2곡",
  ]);
  assert.deepEqual(
    albumIssues(album({ cover_url: "", released_on: null }), [title], []),
    ["커버 없음", "발매일 없음"],
  );
});

test("앨범 확인: 여러 가수 앨범·컴필레이션은 타이틀곡이 없어도 됨", () => {
  assert.deepEqual(albumIssues(album({ artist: null }), [bSide], []), []);
  assert.deepEqual(albumIssues(album({ kind: "compile" }), [bSide], []), []);
});

test("앨범 확인: 부제를 뺀 이름과 가수가 같은 다른 앨범은 중복 의심", () => {
  const first = album({
    id: 1,
    title: "NCT #127 CHERRY BOMB – The 3rd Mini Album",
  });
  const second = album({
    id: 2,
    title: "NCT #127 Cherry Bomb - The 3rd Mini Album",
  });
  const other = album({ id: 3, artist: "NCT DREAM" });
  assert.deepEqual(albumIssues(first, [title], [first, second, other]), [
    "중복 의심",
  ]);
  assert.deepEqual(albumIssues(other, [title], [first, second, other]), []);
});
