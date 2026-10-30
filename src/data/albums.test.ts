import { test } from "node:test";
import assert from "node:assert/strict";
import {
  albumArtist,
  deezerAlbum,
  findAlbum,
  guessTitleTrack,
  itunesAlbum,
  matchAlbum,
  pickAlbum,
  type FoundAlbum,
} from "./albums.ts";
import type { AlbumRow } from "./build-catalog.ts";

// Fixtures shaped like Deezer and iTunes responses, so real data can't break these rules.
const found = (over: Partial<FoundAlbum>): FoundAlbum => ({
  title: "A",
  credited: "X",
  kind: "album",
  released_on: "2022-01-01",
  cover_url: "",
  external_id: "",
  tracks: 10,
  ...over,
});
const song = {
  artist: "NCT DREAM",
  title: "버퍼링 (Glitch Mode)",
  aliases: [],
};

test("Deezer 앨범: 종류·발매일·출처를 읽고 모르는 종류는 비움", () => {
  assert.deepEqual(
    deezerAlbum({
      id: 7,
      title: "Glitch Mode - The 2nd Album",
      record_type: "album",
      release_date: "2022-03-28",
      nb_tracks: 11,
      cover_xl: "c",
      artist: { name: "NCT DREAM" },
    }),
    {
      title: "Glitch Mode - The 2nd Album",
      credited: "NCT DREAM",
      kind: "album",
      released_on: "2022-03-28",
      cover_url: "c",
      external_id: "deezer:7",
      tracks: 11,
    },
  );
  const odd = deezerAlbum({ id: 1, title: "B", record_type: "x" });
  assert.equal(odd.kind, "");
  assert.equal(odd.released_on, null);
});

test("iTunes 앨범: ' - Single'·' - EP'를 종류로 바꾸고 이름에서 뺌", () => {
  const single = itunesAlbum({
    collectionName: "Beatbox - Single",
    collectionId: 9,
    releaseDate: "2022-05-30T12:00:00Z",
    trackCount: 1,
  });
  assert.equal(single.title, "Beatbox");
  assert.equal(single.kind, "single");
  assert.equal(single.released_on, "2022-05-30");
  assert.equal(single.external_id, "itunes:9");
  assert.equal(itunesAlbum({ collectionName: "Y - EP" }).kind, "ep");
  assert.equal(itunesAlbum({ collectionName: "Z" }).kind, "album");
});

test("앨범 고르기: 정규·미니 > 선공개 싱글 > 컴필레이션, 같으면 이른 발매(리패키지보다 원본)", () => {
  const original = found({ title: "Sticker", released_on: "2021-09-17" });
  const repackage = found({ title: "Favorite", released_on: "2021-10-25" });
  const preRelease = found({ kind: "single", released_on: "2021-09-01" });
  const compile = found({ kind: "compile", released_on: "2020-01-01" });
  assert.equal(pickAlbum([repackage, compile, preRelease, original]), original);
  assert.equal(pickAlbum([compile, preRelease]), preRelease);
  // iTunes gives a track's own date, so both carry it: the repackage loses the tie.
  const sameDay = found({
    title: "Sticker - Repackage",
    released_on: "2021-09-17",
  });
  assert.equal(pickAlbum([sameDay, original]), original);
  assert.equal(pickAlbum([found({ title: "iScreaM Vol.16" })]), null);
  assert.equal(pickAlbum([]), null);
});

test("타이틀곡 추정: 앨범명이 곡 이름으로 시작·끝나거나, 한 곡짜리 싱글", () => {
  const album = (title: string, kind = "album" as const, tracks = 10) => ({
    title,
    kind,
    tracks,
  });
  assert.equal(
    guessTitleTrack(song, album("Glitch Mode - The 2nd Album")),
    true,
  );
  assert.equal(
    guessTitleTrack({ title: "Boom", aliases: [] }, album("We Boom")),
    true,
  );
  assert.equal(
    guessTitleTrack({ title: "Arcade", aliases: [] }, album("Glitch Mode")),
    false,
  );
  assert.equal(
    guessTitleTrack(
      { title: "Dreaming", aliases: [] },
      { title: "Station", kind: "single", tracks: 1 },
    ),
    true,
  );
  assert.equal(
    guessTitleTrack(
      { title: "B-side", aliases: [] },
      { title: "Station", kind: "single", tracks: 2 },
    ),
    false,
  );
});

test("저장된 앨범 찾기: 같은 출처, 또는 부제를 뺀 같은 이름(발매일·가수가 둘 다 있으면 같아야 함)", () => {
  const row = (over: Partial<AlbumRow>): AlbumRow => ({
    id: 1,
    title: "Glitch Mode",
    artist: null,
    kind: "",
    released_on: null,
    cover_url: "",
    external_id: "",
    ...over,
  });
  const saved = [
    row({ id: 1, external_id: "deezer:7", title: "다른 이름" }),
    row({ id: 2, title: "glitch mode", released_on: "2022-03-28" }),
  ];
  const look = (over: Partial<FoundAlbum>) =>
    matchAlbum(saved, found({ title: "Glitch Mode", ...over }))?.id ?? null;
  assert.equal(look({ external_id: "deezer:7" }), 1);
  assert.equal(look({ released_on: "2022-03-28" }), 2);
  assert.equal(look({ released_on: null }), 2);
  assert.equal(look({ released_on: "2023-01-01" }), null);
  // An album typed by hand matches the one found with its subtitle.
  assert.equal(
    look({ title: "Glitch Mode - The 2nd Album", released_on: "2022-03-28" }),
    2,
  );
  const typed = [row({ id: 3, artist: "NCT U", title: "Resonance" })];
  const by = (title: string, credited: string) =>
    matchAlbum(typed, found({ title, credited }))?.id ?? null;
  assert.equal(by("RESONANCE Pt.1", "NCT"), null);
  assert.equal(by("Resonance", "NCT"), 3);
  assert.equal(by("Resonance", "aespa"), null);
});

test("앨범 가수: 그 곡의 가수로 표기된 앨범만 그 가수, 그룹·컴필레이션 앨범은 비움", () => {
  assert.equal(
    albumArtist(found({ credited: "nct dream" }), { artist: "NCT DREAM" }),
    "NCT DREAM",
  );
  assert.equal(
    albumArtist(found({ credited: "NCT" }), { artist: "NCT U" }),
    null,
  );
  assert.equal(
    albumArtist(found({ credited: "Various Artists" }), { artist: "aespa" }),
    null,
  );
  // A solo artist credited in English is still theirs.
  assert.equal(
    albumArtist(found({ credited: "DOYOUNG" }), {
      artist: "도영",
      englishArtist: "DOYOUNG",
    }),
    "도영",
  );
});

test("찾기: Deezer 곡 검색 → 앨범 상세에서 고르고, 없으면 iTunes", async () => {
  const track = (albumId: number, title_short = "버퍼링 Glitch Mode") => ({
    title: title_short,
    title_short,
    title_version: "",
    artist: { name: "NCT DREAM" },
    album: { id: albumId, title: `Album ${albumId}`, cover_xl: "" },
  });
  const deezer: Record<string, unknown> = {
    "album/1": {
      id: 1,
      title: "Repackage",
      record_type: "album",
      release_date: "2022-05-30",
    },
    "album/2": {
      id: 2,
      title: "Glitch Mode",
      record_type: "album",
      release_date: "2022-03-28",
    },
  };
  const asked: string[] = [];
  const get = async (urls: string[]) =>
    urls.map((url) => {
      asked.push(url);
      if (url.includes("/search?"))
        return { data: [track(1), track(2), track(3, "Arcade")] };
      return deezer[url.replace(/^.*\.com\//, "")];
    });
  const album = await findAlbum(song, get);
  assert.equal(album?.title, "Glitch Mode");
  assert.equal(album?.external_id, "deezer:2");
  // Album 3 holds another song: its details are never fetched.
  assert.ok(!asked.some((url) => url.endsWith("album/3")));
  assert.ok(!asked.some((url) => url.includes("itunes")));

  const itunesOnly = async (urls: string[]) =>
    urls.map((url) =>
      url.includes("itunes")
        ? {
            results: [
              {
                artistName: "NCT DREAM",
                trackName: "버퍼링 (Glitch Mode)",
                collectionName: "Glitch Mode - The 2nd Album",
                collectionId: 5,
                releaseDate: "2022-03-28T12:00:00Z",
              },
            ],
          }
        : { data: [] },
    );
  assert.equal((await findAlbum(song, itunesOnly))?.external_id, "itunes:5");
  assert.equal(
    await findAlbum(song, async (urls) => urls.map(() => ({ data: [] }))),
    null,
  );
});

test("찾기: Deezer 요청 한도에 걸리면 못 찾은 것이 아니라 실패", async () => {
  await assert.rejects(
    findAlbum(song, async (urls) =>
      urls.map(() => ({ error: { code: 4, message: "Quota" } })),
    ),
  );
});
