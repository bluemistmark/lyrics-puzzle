import { test } from "node:test";
import assert from "node:assert/strict";
import {
  artworkQueries,
  coverAt,
  itunesUrls,
  pickAlbumCover,
  pickItunesCover,
  pickTrackCover,
  songNames,
  type DeezerTrack,
} from "./artwork.ts";

// Fixtures shaped like Deezer search results, so real data can't break these rules.
const track = (
  title_short: string,
  artist: string,
  album: string,
  cover: string,
  title_version = "",
): DeezerTrack => ({
  title: `${title_short} ${title_version}`.trim(),
  title_short,
  title_version,
  artist: { name: artist },
  album: { title: album, cover_xl: cover },
});
const song = (artist: string, title: string, aliases: string[] = []) => ({
  artist,
  title,
  aliases,
});

test("곡 이름: 괄호 앞 제목, 괄호 안 다른 이름, 별칭 (피처링·버전 제외)", () => {
  assert.deepEqual(songNames(song("A", "영웅 (英雄; Kick It)")), [
    "영웅",
    "英雄",
    "kick it",
  ]);
  assert.deepEqual(
    songNames(song("A", "Make A Wish (Birthday Song)", ["Make A Wish"])),
    ["make a wish", "birthday song"],
  );
  assert.deepEqual(songNames(song("A", "Sticker (feat. B)")), ["sticker"]);
  assert.deepEqual(songNames(song("A", "90’s Love")), ["90s love"]);
});

test("검색 순서: 앨범이 있으면 앨범 먼저, 그다음 곡 이름마다", () => {
  assert.deepEqual(
    artworkQueries({
      ...song("NCT DREAM", "버퍼링 (Glitch Mode)"),
      album: " Glitch Mode ",
    }),
    [
      { kind: "album", q: "NCT DREAM Glitch Mode" },
      { kind: "track", q: "NCT DREAM 버퍼링" },
      { kind: "track", q: "NCT DREAM Glitch Mode" },
    ],
  );
});

test("곡 커버: 같은 가수의 원곡만, 리믹스·리믹스 앨범·다른 가수는 건너뜀", () => {
  const results = [
    track("Baggy Jeans", "The Band", "Single", "band"),
    track("Baggy Jeans", "NCT U", "Remixes", "remix", "(B Remix)"),
    track(
      "Baggy Jeans",
      "NCT U",
      "iScreaM Vol.27 : Baggy Jeans Remixes",
      "iscream",
    ),
    track("Baggy Jeans", "NCT U", "Golden Age - The 4th Album", "golden"),
  ];
  assert.equal(pickTrackCover(results, song("NCT U", "Baggy Jeans")), "golden");
  assert.equal(
    pickTrackCover(results.slice(0, 3), song("NCT U", "Baggy Jeans")),
    null,
  );
});

test("곡 커버: 한글 제목과 영어 제목이 붙은 이름도 단어 경계로 인정", () => {
  const results = [
    track("영웅 Kick It 英雄", "NCT 127", "Neo Zone", "neo"),
    track("버퍼링 Glitch Mode", "NCT DREAM", "Glitch Mode", "glitch"),
  ];
  assert.equal(
    pickTrackCover(results, song("NCT 127", "영웅 (英雄; Kick It)")),
    "neo",
  );
  assert.equal(
    pickTrackCover(results, song("NCT DREAM", "Glitch Mode")),
    "glitch",
  );
  // A word inside another title is not the song.
  assert.equal(pickTrackCover(results, song("NCT 127", "Kick")), null);
});

test("곡 커버: 유닛 곡이 그룹 이름으로 올라온 것도 인정", () => {
  const results = [track("Resonance", "NCT", "NCT 2020", "resonance")];
  assert.equal(
    pickTrackCover(results, song("NCT U", "Resonance")),
    "resonance",
  );
  assert.equal(pickTrackCover(results, song("WayV", "Resonance")), null);
});

test("앨범 커버: 부제가 붙은 앨범 이름도 인정하고 리믹스 앨범은 건너뜀", () => {
  const albums = [
    {
      title: "iScreaM Vol.16 : 버퍼링 Glitch Mode Remix",
      artist: { name: "NCT DREAM" },
      cover_xl: "remix",
    },
    {
      title: "Glitch Mode - The 2nd Album",
      artist: { name: "NCT DREAM" },
      cover_xl: "album",
    },
  ];
  const dream = { ...song("NCT DREAM", "버퍼링"), album: "Glitch Mode" };
  assert.equal(pickAlbumCover(albums, dream), "album");
  assert.equal(pickAlbumCover(albums, { ...dream, album: "" }), null);
  assert.equal(pickAlbumCover(albums, { ...dream, artist: "NCT 127" }), null);
  assert.equal(pickAlbumCover(albums, { ...dream, artist: "aespa" }), null);
});

test("커버 크기는 Deezer 주소만 바꿈", () => {
  assert.equal(
    coverAt(
      "https://cdn-images.dzcdn.net/images/cover/08b4a4aa/1000x1000-000000-80-0-0.jpg",
      400,
    ),
    "https://cdn-images.dzcdn.net/images/cover/08b4a4aa/400x400-000000-80-0-0.jpg",
  );
  assert.equal(
    coverAt("https://example.com/a/1000x1000-x.jpg", 400),
    "https://example.com/a/1000x1000-x.jpg",
  );
});

test("iTunes 보완: 괄호 뒤는 버전으로 보고 같은 규칙으로 고름", () => {
  const results = [
    {
      artistName: "ZZang KARAOKE",
      trackName: "Sticker (By NCT 127)",
      collectionName: "K",
      artworkUrl100: "k",
    },
    {
      artistName: "NCT 127",
      trackName: "Sticker (English Ver.)",
      collectionName: "S",
      artworkUrl100: "en",
    },
    {
      artistName: "NCT 127",
      trackName: "Sticker",
      collectionName: "Sticker - The 3rd Album",
      artworkUrl100: "sticker",
    },
  ];
  assert.equal(pickItunesCover(results, song("NCT 127", "Sticker")), "sticker");
  assert.equal(
    pickItunesCover(results.slice(0, 2), song("NCT 127", "Sticker")),
    null,
  );
  assert.deepEqual(
    itunesUrls(song("NCT 127", "질주 (2 Baddies)")).map((u) =>
      new URL(u).searchParams.get("term"),
    ),
    ["NCT 127 질주", "NCT 127 2 Baddies"],
  );
  assert.equal(
    coverAt(
      "https://is1-ssl.mzstatic.com/image/thumb/Music/ab/cd/100x100bb.jpg",
      400,
    ),
    "https://is1-ssl.mzstatic.com/image/thumb/Music/ab/cd/400x400bb.jpg",
  );
});
