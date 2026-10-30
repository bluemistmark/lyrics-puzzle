import {
  albumArtist,
  findAlbum,
  guessTitleTrack,
  matchAlbum,
  type FoundAlbum,
  type Get,
} from "../data/albums.ts";
import type { AlbumRow, SongRow } from "../data/build-catalog.ts";
import { useAdmin } from "./store";
import { supabase } from "./supabase";

/** Deezer allows 50 requests per 5 seconds; iTunes about 20 a minute. */
const GAP_MS = { deezer: 120, itunes: 3100 };
const nextAt = { deezer: 0, itunes: 0 };
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
const hostOf = (url: string) => (url.includes("itunes") ? "itunes" : "deezer");

/** Waits for each API's turn, so filling many songs stays under their limits. */
async function pace(urls: string[]) {
  for (const host of ["deezer", "itunes"] as const) {
    const count = urls.filter((url) => hostOf(url) === host).length;
    if (!count) continue;
    const start = Math.max(Date.now(), nextAt[host]);
    nextAt[host] = start + GAP_MS[host] * count;
    await sleep(start - Date.now());
  }
}

/** Deezer and iTunes through /api/lookup (neither answers a browser directly). */
const lookUp: Get = async (urls) => {
  await pace(urls);
  const { data } = await supabase!.auth.getSession();
  const res = await fetch("/api/lookup", {
    method: "POST",
    headers: {
      authorization: `Bearer ${data.session?.access_token ?? ""}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ urls }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    results?: { status: number; body: unknown }[];
  };
  if (!res.ok || !body.results)
    throw Error(body.error ?? `검색 실패 (${res.status})`);
  return body.results.map((r, i) => {
    if (r.status === 200) return r.body;
    const name = hostOf(urls[i]) === "itunes" ? "iTunes" : "Deezer";
    throw Error(
      r.status === 403 || r.status === 429
        ? `${name} 요청이 너무 많아요. 1분쯤 뒤 다시 시도하세요.`
        : `${name} 검색 실패 (${r.status || "응답 없음"})`,
    );
  });
};

/** What 자동 채우기 found for a song: its album (already saved or not) and a title track guess. */
export type AlbumSuggestion = {
  found: FoundAlbum;
  existing: AlbumRow | null;
  /** The artist a new album gets (null for a group or compilation album). */
  artist: string | null;
  titleTrack: boolean;
};

export async function suggestAlbum(
  song: Pick<SongRow, "artist" | "title" | "aliases">,
): Promise<AlbumSuggestion | null> {
  const found = await findAlbum(song, lookUp);
  if (!found) return null;
  return {
    found,
    existing: matchAlbum(useAdmin.getState().albums, found),
    artist: albumArtist(found, song.artist),
    titleTrack: guessTitleTrack(song, found),
  };
}

/** The suggested album's id: a saved one gets what it lacks from the lookup, a new one is
 *  saved. */
export async function albumIdFor({ found, existing, artist }: AlbumSuggestion) {
  const { albums, saveAlbum } = useAdmin.getState();
  const saved =
    (existing && albums.find((a) => a.id === existing.id)) ??
    matchAlbum(albums, found);
  const row = {
    title: found.title,
    artist,
    kind: found.kind,
    released_on: found.released_on,
    cover_url: found.cover_url,
    external_id: found.external_id,
  };
  if (!saved) return (await saveAlbum(row)).id;
  const filled = {
    ...saved,
    artist: saved.artist ?? row.artist,
    kind: saved.kind || row.kind,
    released_on: saved.released_on ?? row.released_on,
    cover_url: saved.cover_url || row.cover_url,
    external_id: saved.external_id || row.external_id,
  };
  if (JSON.stringify(filled) !== JSON.stringify(saved)) await saveAlbum(filled);
  return saved.id;
}

/** Finds and saves the album of a song that has none (a title track guess only turns the flag
 *  on). Returns whether one was found; throws when the lookup failed. */
export async function fillSong(song: SongRow) {
  const suggestion = await suggestAlbum(song);
  if (!suggestion) return false;
  const album_id = await albumIdFor(suggestion);
  const row = { ...song, album_id };
  row.title_track = song.title_track || suggestion.titleTrack;
  delete row.updated_at;
  await useAdmin.getState().saveSong(row, false);
  return true;
}
