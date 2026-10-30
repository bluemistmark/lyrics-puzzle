import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AlbumRow,
  ArtworkRow,
  Rows,
  SettingsRow,
} from "./build-catalog.ts";
import { RELEASE_COLUMNS, type ReleaseRow } from "./releases.ts";

// Supabase returns at most 1000 rows per request by default. Pages are ordered
// by a unique key so they never overlap; buildCatalog applies the real order.
const PAGE = 1000;

async function fetchAll<T>(
  client: SupabaseClient,
  table: string,
  columns: string,
  order: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .order(order)
      .range(from, from + PAGE - 1);
    if (error) throw Error(`${table} 읽기 실패: ${error.message}`);
    rows.push(...(data as T[]));
    if (data.length < PAGE) return rows;
  }
}

export const ARTIST_COLUMNS = "name,prefix,sort_order,main,english_name";
export const SONG_COLUMNS =
  "id,artist,title,aliases,sort_order,album_id,title_track,updated_at";
export const ALBUM_COLUMNS =
  "id,title,artist,kind,released_on,cover_url,external_id,updated_at";
export const QUESTION_COLUMNS = "id,song_id,lines,active,updated_at";
export const DICTIONARY_COLUMNS =
  "english,pronunciation,alternatives,updated_at";
export const ARTWORK_COLUMNS = "song_id,url,manual,checked_at";
export const SETTINGS_COLUMNS =
  "id,known_weight,unknown_weight,min_signal_songs";

/** Loads every row of the data tables. */
export async function fetchRows(client: SupabaseClient): Promise<Rows> {
  const [artists, songs, questions, dictionary] = await Promise.all([
    fetchAll<Rows["artists"][number]>(
      client,
      "artists",
      ARTIST_COLUMNS,
      "name",
    ),
    fetchAll<Rows["songs"][number]>(client, "songs", SONG_COLUMNS, "id"),
    fetchAll<Rows["questions"][number]>(
      client,
      "questions",
      QUESTION_COLUMNS,
      "id",
    ),
    fetchAll<Rows["dictionary"][number]>(
      client,
      "dictionary",
      DICTIONARY_COLUMNS,
      "english",
    ),
  ]);
  return { artists, songs, questions, dictionary };
}

/** Every album (admin only, and the build's 앨범아트). */
export const fetchAlbums = (client: SupabaseClient) =>
  fetchAll<AlbumRow>(client, "albums", ALBUM_COLUMNS, "id");

/** Every song_artwork row (the table may be missing before its migration runs). */
export const fetchArtwork = (client: SupabaseClient) =>
  fetchAll<ArtworkRow>(client, "song_artwork", ARTWORK_COLUMNS, "song_id");

/** The 출제 설정 row, or null when there is none yet (the defaults apply). */
export async function fetchSettings(client: SupabaseClient) {
  const { data, error } = await client
    .from("game_settings")
    .select(SETTINGS_COLUMNS)
    .maybeSingle();
  if (error) throw Error(`game_settings 읽기 실패: ${error.message}`);
  return data as SettingsRow | null;
}

/** Most recent releases first. */
export async function fetchReleases(client: SupabaseClient, limit: number) {
  const { data, error } = await client
    .from("releases")
    .select(RELEASE_COLUMNS)
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw Error(`releases 읽기 실패: ${error.message}`);
  return data as unknown as ReleaseRow[];
}
