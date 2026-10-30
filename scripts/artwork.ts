// 앨범아트 for the build: looks up songs not looked up yet on Deezer (then iTunes for songs
// Deezer lacks), keeps the answers in
// song_artwork, and downloads each cover into public/artwork so it ships with the build
// (the game never asks another server for images). Nothing here may fail the build: a song
// without a cover shows the generated one.
import { createHash } from "node:crypto";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  artworkQueries,
  coverAt,
  itunesUrls,
  pickAlbumCover,
  pickItunesCover,
  pickTrackCover,
  queryUrl,
  type ArtworkSong,
} from "../src/data/artwork.ts";
import type { ArtworkRow } from "../src/data/build-catalog.ts";
import { fetchArtwork } from "../src/data/rows.ts";

/** Songs with no cover found are looked up again after this long. */
const RETRY_DAYS = 14;
/** Deezer allows 50 requests per 5 seconds; iTunes about 20 a minute. */
const PAUSE_MS = 120;
const ITUNES_PAUSE_MS = 3100;
/** iTunes is slow at that pace: songs it has no time for wait for the next build. */
const ITUNES_BUDGET_MS = 5 * 60 * 1000;
/** Pixels on a side; the largest cover on screen is about 200 CSS px. */
const SIZE = 400;
const DOWNLOADS_AT_ONCE = 8;
const MAX_BYTES = 2_000_000;
const dir = new URL("../public/artwork/", import.meta.url);
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** A published song with its album's name and cover (albums table), when it has one. */
export type ArtworkInput = ArtworkSong & { id: string; cover?: string };

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** The first cover the song's Deezer searches find, or "" when none does. */
async function lookUpDeezer(song: ArtworkSong) {
  for (const query of artworkQueries(song)) {
    const res = await fetch(queryUrl(query));
    if (!res.ok) throw Error(`Deezer 응답 ${res.status}`);
    const body = await res.json();
    // Deezer reports errors (e.g. too many requests) with status 200.
    if (body.error)
      throw Error(`Deezer: ${body.error.message ?? body.error.type}`);
    const results = body.data ?? [];
    const cover =
      query.kind === "album"
        ? pickAlbumCover(results, song)
        : pickTrackCover(results, song);
    await sleep(PAUSE_MS);
    if (cover) return cover;
  }
  return "";
}

/** iTunes for what Deezer didn't find: its cover, "" when it has none, or undefined when it
 *  can't be asked now (out of time or refused), so the song is tried again next build. */
function itunes() {
  const deadline = Date.now() + ITUNES_BUDGET_MS;
  let usable = true;
  return async (song: ArtworkSong) => {
    for (const url of itunesUrls(song)) {
      if (!usable || Date.now() > deadline) return undefined;
      const res = await fetch(url).catch(() => null);
      await sleep(ITUNES_PAUSE_MS);
      if (!res?.ok) {
        usable = false;
        console.warn(`iTunes 검색 중단: ${res?.status ?? "연결 실패"}`);
        return undefined;
      }
      const cover = pickItunesCover((await res.json()).results ?? [], song);
      if (cover) return cover;
    }
    return "";
  };
}

/** Looks up the songs that need it and returns song id → cover address for every song that
 *  has one. A failed lookup stops looking (the rest wait for the next build). */
async function syncArtwork(client: SupabaseClient, songs: ArtworkInput[]) {
  const rows = new Map((await fetchArtwork(client)).map((r) => [r.song_id, r]));
  const retryBefore = Date.now() - RETRY_DAYS * 24 * 60 * 60 * 1000;
  // A song on an album with a cover needs no lookup.
  const todo = songs.filter((s) => {
    const row = rows.get(s.id);
    return (
      !s.cover &&
      (!row ||
        (!row.url && !row.manual && Date.parse(row.checked_at) < retryBefore))
    );
  });
  let found = 0;
  let looked = 0;
  const lookUpItunes = itunes();
  try {
    for (const song of todo) {
      const url = (await lookUpDeezer(song)) || (await lookUpItunes(song));
      if (url === undefined) continue;
      const row: ArtworkRow = {
        song_id: song.id,
        url,
        manual: false,
        checked_at: new Date().toISOString(),
      };
      const { error } = await client.from("song_artwork").upsert(row);
      if (error) throw Error(`song_artwork 저장 실패: ${error.message}`);
      rows.set(song.id, row);
      looked++;
      if (row.url) found++;
    }
  } catch (e) {
    console.warn(`앨범아트 찾기 중단: ${(e as Error).message}`);
  }
  if (todo.length) console.log(`앨범아트 찾기: ${looked}곡 중 ${found}곡 찾음`);
  const covers: Record<string, string> = {};
  // One set by hand first, then the album's, then the one looked up.
  for (const song of songs) {
    const row = rows.get(song.id);
    const url = (row?.manual && row.url) || song.cover || row?.url;
    if (url) covers[song.id] = url;
  }
  return covers;
}

/** Saves each cover as public/artwork/<hash of its address>.<ext> (a changed cover gets a new
 *  name, so browsers never keep an old one) and returns song id → path the game loads. */
async function downloadArtwork(covers: Record<string, string>) {
  await mkdir(dir, { recursive: true });
  const saved = new Map(
    (await readdir(dir)).map((file) => [file.replace(/\.\w+$/, ""), file]),
  );
  const paths: Record<string, string> = {};
  let failed = 0;
  const save = async ([id, url]: [string, string]) => {
    const name = createHash("sha1").update(url).digest("hex").slice(0, 12);
    let file = saved.get(name);
    if (!file) {
      try {
        const res = await fetch(coverAt(url, SIZE));
        const ext = EXTENSIONS[res.headers.get("content-type") ?? ""];
        const body = Buffer.from(await res.arrayBuffer());
        if (!res.ok || !ext || body.length > MAX_BYTES) throw Error();
        file = `${name}.${ext}`;
        await writeFile(new URL(file, dir), body);
        saved.set(name, file);
      } catch {
        failed++;
        return;
      }
    }
    paths[id] = `/artwork/${file}`;
  };
  const entries = Object.entries(covers);
  for (let i = 0; i < entries.length; i += DOWNLOADS_AT_ONCE)
    await Promise.all(entries.slice(i, i + DOWNLOADS_AT_ONCE).map(save));
  if (failed) console.warn(`앨범아트 내려받기 실패: ${failed}곡`);
  return paths;
}

/** Song id → path of its cover in the build, for the published songs. Never throws. */
export async function buildArtwork(
  client: SupabaseClient,
  songs: ArtworkInput[],
) {
  try {
    return await downloadArtwork(await syncArtwork(client, songs));
  } catch (e) {
    console.warn(`앨범아트 건너뜀: ${(e as Error).message}`);
    return {};
  }
}
