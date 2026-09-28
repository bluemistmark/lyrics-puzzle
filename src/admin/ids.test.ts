import { test } from "node:test";
import assert from "node:assert/strict";
import { nextQuestionId, nextSongId } from "./ids.ts";

const song = (id: string, artist = "X") => ({
  id,
  artist,
  title: id,
  aliases: [],
  sort_order: 0,
});

test("곡ID는 접두어별 최대 번호 다음, 자릿수 유지, 다른 가수가 쓴 번호도 피함", () => {
  const songs = [
    song("D_009"),
    song("D_058", "Y"),
    song("DD_001"),
    song("D_x"),
  ];
  assert.equal(nextSongId(songs, "D"), "D_059");
  assert.equal(nextSongId(songs, "N"), "N_001");
  assert.equal(nextSongId([song("W_0007")], "W"), "W_0008");
  assert.equal(nextSongId(songs, ""), "");
  assert.equal(nextSongId(songs, "D.*"), "");
});

test("문제ID는 NCT_ 최대 번호 다음", () => {
  const q = (id: string) => ({ id, song_id: "s", lines: [], active: true });
  assert.equal(
    nextQuestionId([q("NCT_0642"), q("NCT_0009"), q("X_9999")]),
    "NCT_0643",
  );
  assert.equal(nextQuestionId([]), "NCT_0001");
});
