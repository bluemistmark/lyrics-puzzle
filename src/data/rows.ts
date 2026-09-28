import type { SupabaseClient } from "@supabase/supabase-js";
import type { Rows } from "./build-catalog.ts";
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

export const ARTIST_COLUMNS = "name,prefix,sort_order";
export const SONG_COLUMNS = "id,artist,title,aliases,sort_order";
export const QUESTION_COLUMNS = "id,song_id,lines,active";
export const DICTIONARY_COLUMNS = "english,pronunciation,alternatives";

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
