// 앨범아트: picking a song's cover from Deezer search results, then iTunes (US) for songs
// Deezer lacks (part of the SM catalog). Pure, so the build script (scripts/artwork.ts) and
// tests share it; the network calls live in the script.

/** The fields of a Deezer track search result that matching reads. */
export type DeezerTrack = {
  title: string;
  /** The title without its version part, e.g. "Baggy Jeans" for a remix. */
  title_short: string;
  /** e.g. "(Hukky Shibaseki Remix)"; empty for the original. */
  title_version: string;
  artist: { name: string };
  album: { id?: number; title: string; cover_xl: string };
};
/** The fields of a Deezer album search result. */
export type DeezerAlbum = {
  title: string;
  artist: { name: string };
  cover_xl: string;
};
/** What a song is looked up by (a slice of the songs row). */
export type ArtworkSong = {
  artist: string;
  title: string;
  aliases: string[];
  album?: string;
};
export type ArtworkQuery = { kind: "album" | "track"; q: string };

/** The fields of an iTunes Search song result. */
export type ItunesTrack = {
  artistName?: string;
  trackName?: string;
  collectionName?: string;
  collectionId?: number;
  artworkUrl100?: string;
  /** e.g. "2023-10-06T12:00:00Z". */
  releaseDate?: string;
  trackCount?: number;
};

export const DEEZER_API = "https://api.deezer.com";
export const ITUNES_API = "https://itunes.apple.com/search";

/** Remixes, other languages, karaoke and the like: never the song's own cover. */
const OTHER_VERSION =
  /remix|english|japanese|chinese|mandarin|inst\b|instrumental|a ?cappella|sped|slowed|live|acoustic|demo|karaoke|\bmix\b/i;
/** SM's remix series and other compilations reuse titles under their own covers. */
export const OTHER_ALBUM = /remix|iscream|screa?m\b|karaoke|instrumental/i;
/** Parts in a title's brackets that aren't another name for it. */
const NOT_A_NAME = /feat|prod|ver\.?$|version|sung by/i;

/** Lowercase letters and digits only (Hangul, Latin, Hanja and so on), words split by one
 *  space; apostrophes just go ("90's" → "90s"). */
export const normalize = (text: string) =>
  text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/['’‘`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** The names a song goes by, as written: the title before its brackets, each name inside
 *  them, and aliases. */
function namesOf(song: Pick<ArtworkSong, "title" | "aliases">) {
  const base = song.title.replace(/\s*[([].*$/, "");
  const inside = /[([]([^)\]]*)/.exec(song.title)?.[1] ?? "";
  const parts = inside
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part && !NOT_A_NAME.test(part));
  const seen = new Set<string>();
  return [base, ...parts, ...song.aliases]
    .map((name) => name.trim())
    .filter((name) => {
      const key = normalize(name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
/** The song's names, normalized for comparing. */
export const songNames = (song: Pick<ArtworkSong, "title" | "aliases">) =>
  namesOf(song).map(normalize);

/** Searches in the order they're worth trying: the album (one cover per album), then the
 *  song by its title, then by each other name. */
export function artworkQueries(song: ArtworkSong): ArtworkQuery[] {
  const queries: ArtworkQuery[] = [];
  if (song.album?.trim())
    queries.push({ kind: "album", q: `${song.artist} ${song.album.trim()}` });
  for (const name of namesOf(song))
    queries.push({ kind: "track", q: `${song.artist} ${name}` });
  return queries;
}

export const queryUrl = ({ kind, q }: ArtworkQuery, limit = 10) =>
  `${DEEZER_API}/search${kind === "album" ? "/album" : ""}?${new URLSearchParams({ q, limit: String(limit) })}`;

/** iTunes searches: the song by each of its names, in the US store (the Korean one has no
 *  music). */
export const itunesUrls = (song: ArtworkSong, limit = 10) =>
  namesOf(song).map(
    (name) =>
      `${ITUNES_API}?${new URLSearchParams({ term: `${song.artist} ${name}`, entity: "song", country: "US", limit: String(limit) })}`,
  );

/** Credited to the song's artist: the same name, or the group a unit belongs to ("NCT"). */
function sameArtist(found: string, artist: string) {
  const a = normalize(found);
  const b = normalize(artist);
  return a === b || a === b.split(" ")[0];
}

/** `words` begins or ends with `name`, on word boundaries (Deezer joins a Korean title and its
 *  English one, e.g. "버퍼링 Glitch Mode"). */
export function hasName(words: string, name: string) {
  return (
    words === name || words.startsWith(`${name} `) || words.endsWith(` ${name}`)
  );
}

/** The track is this song in its original version, on an album of its own (not a remix
 *  series or other compilation). */
export const isSongTrack = (t: DeezerTrack, song: ArtworkSong) =>
  sameArtist(t.artist.name, song.artist) &&
  !OTHER_VERSION.test(t.title_version) &&
  !OTHER_ALBUM.test(t.album.title) &&
  songNames(song).some((name) => hasName(normalize(t.title_short), name));

/** The cover of the first track that is this song in its original version, or null. */
export function pickTrackCover(
  results: readonly DeezerTrack[],
  song: ArtworkSong,
): string | null {
  const hit = results.find((t) => isSongTrack(t, song));
  return hit?.album.cover_xl || null;
}

/** iTunes results read as Deezer tracks: the version is the bracketed tail of the name. */
export const asDeezer = (t: ItunesTrack): DeezerTrack => {
  const name = t.trackName ?? "";
  const cut = name.search(/\s*[([]/);
  return {
    title: name,
    title_short: cut < 0 ? name : name.slice(0, cut),
    title_version: cut < 0 ? "" : name.slice(cut),
    artist: { name: t.artistName ?? "" },
    album: {
      id: t.collectionId,
      title: t.collectionName ?? "",
      cover_xl: t.artworkUrl100 ?? "",
    },
  };
};
/** The same rules as Deezer tracks, over iTunes results. */
export const pickItunesCover = (
  results: readonly ItunesTrack[],
  song: ArtworkSong,
) => pickTrackCover(results.map(asDeezer), song);

/** The cover of the album named on the song (e.g. "Glitch Mode" finds "Glitch Mode - The 2nd
 *  Album"), or null. */
export function pickAlbumCover(
  results: readonly DeezerAlbum[],
  song: ArtworkSong,
): string | null {
  const album = normalize(song.album ?? "");
  if (!album) return null;
  const hit = results.find((a) => {
    if (!sameArtist(a.artist.name, song.artist) || OTHER_ALBUM.test(a.title))
      return false;
    const title = normalize(a.title);
    const head = normalize(a.title.split(/\s[-–]\s/)[0]);
    return title === album || head === album || hasName(title, album);
  });
  return hit?.cover_xl || null;
}

/** A Deezer or iTunes cover at another size (they come as …/1000x1000-000000-80-0-0.jpg and
 *  …/100x100bb.jpg); other addresses are returned as they are. */
export const coverAt = (url: string, size: number) =>
  url
    .replace(
      /(dzcdn\.net\/images\/cover\/[0-9a-f]+\/)\d+x\d+-/,
      `$1${size}x${size}-`,
    )
    .replace(
      /(mzstatic\.com\/.+\/)\d+x\d+bb\.(jpg|png)$/,
      `$1${size}x${size}bb.jpg`,
    );
