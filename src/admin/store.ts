import { create } from "zustand";
import {
  sortArtists,
  type ArtistRow,
  type DictionaryRow,
  type QuestionRow,
  type Rows,
  type SongRow,
} from "../data/build-catalog.ts";
import type { ReleaseRow } from "../data/releases.ts";
import {
  ARTIST_COLUMNS,
  DICTIONARY_COLUMNS,
  fetchReleases,
  fetchRows,
  QUESTION_COLUMNS,
  SONG_COLUMNS,
} from "../data/rows.ts";
import { describeError, supabase } from "./supabase";

type AdminStore = Rows & {
  status: "idle" | "loading" | "ready" | "error";
  error: string;
  /** Recent releases, newest first. Loading them may fail on its own (e.g. migration not run yet). */
  releases: ReleaseRow[];
  releasesError: string;
  load: () => Promise<void>;
  /** Called after /api/publish recorded a release. */
  addRelease: (row: ReleaseRow) => void;
  removeRelease: (id: number) => Promise<void>;
  /** `originalName` is null for a new artist; renaming cascades to its songs in the DB. */
  saveArtist: (row: ArtistRow, originalName: string | null) => Promise<void>;
  removeArtist: (name: string) => Promise<void>;
  /** Swaps sort order with the neighbouring artist. */
  moveArtist: (name: string, direction: -1 | 1) => Promise<void>;
  saveSong: (row: SongRow, isNew: boolean) => Promise<void>;
  removeSong: (id: string) => Promise<void>;
  saveQuestion: (row: QuestionRow, isNew: boolean) => Promise<void>;
  /** Inserts all rows in one request: either every row is saved or none is. */
  addQuestions: (rows: QuestionRow[]) => Promise<void>;
  removeQuestion: (id: string) => Promise<void>;
  saveEntry: (row: DictionaryRow, isNew: boolean) => Promise<void>;
  removeEntry: (english: string) => Promise<void>;
};

const db = () => {
  if (!supabase) throw Error("Supabase 환경 변수가 설정되지 않았습니다.");
  return supabase;
};

/**
 * Inserts `row` (match = null) or updates the row whose `match[0]` column equals
 * `match[1]`, and returns it as stored. Errors are thrown as Korean messages.
 */
async function write<T>(
  table: string,
  columns: string,
  row: T,
  match: [column: string, value: string] | null,
): Promise<T> {
  // No generated DB types, so the untyped query builder gets plain records.
  const values = row as Record<string, unknown>;
  const query = match
    ? db().from(table).update(values).eq(match[0], match[1])
    : db().from(table).insert(values);
  const { data, error } = await query.select(columns).single();
  if (error) throw Error(describeError(error));
  return data as T;
}
async function remove(table: string, key: string, value: string) {
  const { error } = await db().from(table).delete().eq(key, value);
  if (error) throw Error(describeError(error));
}
const upsertLocal = <T>(list: T[], row: T, same: (item: T) => boolean) =>
  list.some(same)
    ? list.map((item) => (same(item) ? row : item))
    : [...list, row];

/** Admin copy of all DB rows. Every action writes to Supabase first, then updates local state. */
export const useAdmin = create<AdminStore>()((set, get) => ({
  artists: [],
  songs: [],
  questions: [],
  dictionary: [],
  status: "idle",
  error: "",
  releases: [],
  releasesError: "",
  load: async () => {
    set({ status: "loading", error: "" });
    const releases = fetchReleases(db(), 20).then(
      (rows) => set({ releases: rows, releasesError: "" }),
      (error) => set({ releases: [], releasesError: (error as Error).message }),
    );
    try {
      set({ ...(await fetchRows(db())) });
      await releases;
      set({ status: "ready" });
    } catch (error) {
      set({ status: "error", error: (error as Error).message });
    }
  },
  addRelease: (row) => set({ releases: [row, ...get().releases] }),
  removeRelease: async (id) => {
    await remove("releases", "id", String(id));
    set({ releases: get().releases.filter((r) => r.id !== id) });
  },
  saveArtist: async (row, originalName) => {
    const match: [string, string] | null =
      originalName === null ? null : ["name", originalName];
    const saved = await write("artists", ARTIST_COLUMNS, row, match);
    const { artists, songs } = get();
    const renamed = originalName !== null && originalName !== saved.name;
    set({
      artists: upsertLocal(
        artists,
        saved,
        (a) => a.name === (originalName ?? saved.name),
      ),
      // Mirrors the `on update cascade` foreign key.
      songs: renamed
        ? songs.map((s) =>
            s.artist === originalName ? { ...s, artist: saved.name } : s,
          )
        : songs,
    });
  },
  removeArtist: async (name) => {
    await remove("artists", "name", name);
    set({ artists: get().artists.filter((a) => a.name !== name) });
  },
  moveArtist: async (name, direction) => {
    const ordered = sortArtists(get().artists);
    const i = ordered.findIndex((a) => a.name === name);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= ordered.length) return;
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    // Renumber everyone 0..n-1 (gaps from deletions would otherwise let a swap
    // jump past other artists) and save only the rows whose number changed.
    const current = new Map(get().artists.map((a) => [a.name, a.sort_order]));
    const changed = ordered
      .map((a, index) => ({ ...a, sort_order: index }))
      .filter((a) => current.get(a.name) !== a.sort_order);
    const saved = await Promise.all(
      changed.map((a) => write("artists", ARTIST_COLUMNS, a, ["name", a.name])),
    );
    const byName = new Map(saved.map((a) => [a.name, a]));
    set({ artists: get().artists.map((a) => byName.get(a.name) ?? a) });
  },
  saveSong: async (row, isNew) => {
    const saved = await write(
      "songs",
      SONG_COLUMNS,
      row,
      isNew ? null : ["id", row.id],
    );
    set({ songs: upsertLocal(get().songs, saved, (s) => s.id === saved.id) });
  },
  removeSong: async (id) => {
    await remove("songs", "id", id);
    // Questions are removed by the `on delete cascade` foreign key.
    set({
      songs: get().songs.filter((s) => s.id !== id),
      questions: get().questions.filter((q) => q.song_id !== id),
    });
  },
  saveQuestion: async (row, isNew) => {
    const saved = await write(
      "questions",
      QUESTION_COLUMNS,
      row,
      isNew ? null : ["id", row.id],
    );
    set({
      questions: upsertLocal(get().questions, saved, (q) => q.id === saved.id),
    });
  },
  addQuestions: async (rows) => {
    const { data, error } = await db()
      .from("questions")
      .insert(rows)
      .select(QUESTION_COLUMNS);
    if (error) throw Error(describeError(error));
    set({ questions: [...get().questions, ...(data as QuestionRow[])] });
  },
  removeQuestion: async (id) => {
    await remove("questions", "id", id);
    set({ questions: get().questions.filter((q) => q.id !== id) });
  },
  saveEntry: async (row, isNew) => {
    const saved = await write(
      "dictionary",
      DICTIONARY_COLUMNS,
      row,
      isNew ? null : ["english", row.english],
    );
    set({
      dictionary: upsertLocal(
        get().dictionary,
        saved,
        (d) => d.english === saved.english,
      ),
    });
  },
  removeEntry: async (english) => {
    await remove("dictionary", "english", english);
    set({ dictionary: get().dictionary.filter((d) => d.english !== english) });
  },
}));
