// 앨범 찾기: the album a song came out on (name, kind, release date, cover) from Deezer, then
// iTunes (US) for songs Deezer lacks, and a guess at whether it's the title track (neither
// API says). Pure apart from the injected `get`, so the admin (through /api/lookup) and
// tests share it.
import {
  artworkQueries,
  asDeezer,
  DEEZER_API,
  hasName,
  isSongTrack,
  itunesUrls,
  normalize,
  OTHER_ALBUM,
  queryUrl,
  songNames,
  type ArtworkSong,
  type DeezerTrack,
  type ItunesTrack,
} from "./artwork.ts";
import type { AlbumKind, AlbumRow } from "./build-catalog.ts";

/** An album found online, before it is saved. `tracks` is its number of tracks. */
export type FoundAlbum = Omit<AlbumRow, "id" | "updated_at"> & {
  tracks: number;
};

/** Fetches each address and returns the JSON bodies in order; throws when a request fails. */
export type Get = (urls: string[]) => Promise<unknown[]>;

export const KIND_LABELS: Record<AlbumKind, string> = {
  album: "정규",
  ep: "미니",
  single: "싱글",
  compile: "컴필레이션",
  "": "",
};

/** Deezer album fields that are read. */
export type DeezerAlbumDetails = {
  id: number;
  title: string;
  record_type?: string;
  release_date?: string;
  nb_tracks?: number;
  cover_xl?: string;
  artist?: { name: string };
};

const KINDS = new Set<string>(["album", "ep", "single", "compile"]);
/** Deezer's "Quota limit exceeded": the lookup has to wait, not give up. */
const QUOTA = 4;

export function deezerAlbum(a: DeezerAlbumDetails): FoundAlbum {
  return {
    title: a.title,
    artist: a.artist?.name ?? "",
    kind: (KINDS.has(a.record_type ?? "") ? a.record_type : "") as AlbumKind,
    released_on: /^\d{4}-\d{2}-\d{2}$/.test(a.release_date ?? "")
      ? a.release_date!
      : null,
    cover_url: a.cover_xl ?? "",
    external_id: `deezer:${a.id}`,
    tracks: a.nb_tracks ?? 0,
  };
}

/** iTunes names singles and EPs "X - Single" and "X - EP". */
export function itunesAlbum(t: ItunesTrack): FoundAlbum {
  const name = t.collectionName ?? "";
  const kind = / - Single$/.test(name)
    ? "single"
    : / - EP$/.test(name)
      ? "ep"
      : "album";
  return {
    title: name.replace(/ - (Single|EP)$/, ""),
    artist: t.artistName ?? "",
    kind,
    released_on: t.releaseDate?.slice(0, 10) ?? null,
    cover_url: t.artworkUrl100 ?? "",
    external_id: t.collectionId ? `itunes:${t.collectionId}` : "",
    tracks: t.trackCount ?? 0,
  };
}

/** Albums and EPs over a pre-release single, singles over compilations; then the earliest
 *  (the original over its repackage; iTunes dates each track, so a tie goes to the one not
 *  called a repackage). */
const RANK: Record<AlbumKind, number> = {
  album: 0,
  ep: 0,
  single: 1,
  compile: 2,
  "": 2,
};
const REPACKAGE = /repackage/i;
export function pickAlbum(found: readonly FoundAlbum[]): FoundAlbum | null {
  const [best] = found
    .filter((a) => !OTHER_ALBUM.test(a.title))
    .sort(
      (a, b) =>
        RANK[a.kind] - RANK[b.kind] ||
        (a.released_on ?? "9999").localeCompare(b.released_on ?? "9999") ||
        Number(REPACKAGE.test(a.title)) - Number(REPACKAGE.test(b.title)),
    );
  return best ?? null;
}

/** A title track, probably: the album is named after the song ("Glitch Mode - The 2nd Album"
 *  for 버퍼링 (Glitch Mode)), or it's a single of this song alone. */
export function guessTitleTrack(
  song: Pick<ArtworkSong, "title" | "aliases">,
  album: Pick<FoundAlbum, "title" | "kind" | "tracks">,
) {
  const head = albumHead(album.title);
  return (
    songNames(song).some((name) => name.length > 1 && hasName(head, name)) ||
    (album.kind === "single" && album.tracks === 1)
  );
}

/** An album's name without its subtitle: "Glitch Mode - The 2nd Album" → "glitch mode". */
const albumHead = (title: string) => normalize(title.split(/\s[-–]\s/)[0]);
const firstWord = (artist: string) => normalize(artist).split(" ")[0];

/** The saved album this one is: the same source, or the same name without subtitles (by the
 *  same group, on the same day, when both say). */
export function matchAlbum(
  albums: readonly AlbumRow[],
  found: Pick<FoundAlbum, "title" | "artist" | "released_on" | "external_id">,
) {
  const head = albumHead(found.title);
  const both = (a: string | null, b: string | null) => !a || !b || a === b;
  return (
    (found.external_id &&
      albums.find((a) => a.external_id === found.external_id)) ||
    albums.find(
      (a) =>
        albumHead(a.title) === head &&
        both(a.released_on, found.released_on) &&
        both(firstWord(a.artist), firstWord(found.artist)),
    ) ||
    null
  );
}

type DeezerError = { error?: { code?: number; message?: string } };
function checkDeezer(body: unknown) {
  const error = (body as DeezerError | null)?.error;
  if (error?.code === QUOTA) throw Error("Deezer 요청이 너무 많아요.");
  return !error;
}

/** The song's album, or null when neither Deezer nor iTunes has it. Throws when a lookup
 *  fails (the caller may try again later). */
export async function findAlbum(
  song: ArtworkSong,
  get: Get,
): Promise<FoundAlbum | null> {
  const searches = artworkQueries({ ...song, album: "" }).map((q) =>
    queryUrl(q, 25),
  );
  const tracks = (await get(searches)).flatMap((body) =>
    checkDeezer(body) ? ((body as { data?: DeezerTrack[] }).data ?? []) : [],
  );
  const ids = [
    ...new Set(
      tracks.flatMap((t) =>
        isSongTrack(t, song) && t.album.id ? [t.album.id] : [],
      ),
    ),
  ].slice(0, 5);
  if (ids.length) {
    const albums = await get(ids.map((id) => `${DEEZER_API}/album/${id}`));
    const found = pickAlbum(
      albums.flatMap((body) =>
        checkDeezer(body) ? [deezerAlbum(body as DeezerAlbumDetails)] : [],
      ),
    );
    if (found) return found;
  }
  const results = (await get(itunesUrls(song))).flatMap(
    (body) => (body as { results?: ItunesTrack[] } | null)?.results ?? [],
  );
  return pickAlbum(
    results
      .filter((t) => isSongTrack(asDeezer(t), song))
      .map((t) => itunesAlbum(t)),
  );
}
