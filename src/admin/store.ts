import { create } from "zustand";
import type {
  DictionaryRow,
  QuestionRow,
  Rows,
  SongRow,
} from "../data/build-catalog.ts";
import {
  DICTIONARY_COLUMNS,
  fetchRows,
  QUESTION_COLUMNS,
  SONG_COLUMNS,
} from "../data/rows.ts";
import { describeError, supabase } from "./supabase";

type AdminStore = Rows & {
  status: "idle" | "loading" | "ready" | "error";
  error: string;
  load: () => Promise<void>;
  saveSong: (row: SongRow, isNew: boolean) => Promise<void>;
  removeSong: (id: string) => Promise<void>;
  saveQuestion: (row: QuestionRow, isNew: boolean) => Promise<void>;
  removeQuestion: (id: string) => Promise<void>;
  saveEntry: (row: DictionaryRow, isNew: boolean) => Promise<void>;
  removeEntry: (english: string) => Promise<void>;
};

const db = () => {
  if (!supabase) throw Error("Supabase 환경 변수가 설정되지 않았습니다.");
  return supabase;
};

/** Inserts or updates one row and returns it as stored. Errors are thrown as Korean messages. */
async function write<T>(
  table: string,
  columns: string,
  key: keyof T & string,
  row: T,
  isNew: boolean,
): Promise<T> {
  // No generated DB types, so the untyped query builder gets plain records.
  const values = row as Record<string, unknown>;
  const query = isNew
    ? db().from(table).insert(values)
    : db()
        .from(table)
        .update(values)
        .eq(key as string, values[key]);
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
  songs: [],
  questions: [],
  dictionary: [],
  status: "idle",
  error: "",
  load: async () => {
    set({ status: "loading", error: "" });
    try {
      set({ ...(await fetchRows(db())), status: "ready" });
    } catch (error) {
      set({ status: "error", error: (error as Error).message });
    }
  },
  saveSong: async (row, isNew) => {
    const saved = await write("songs", SONG_COLUMNS, "id", row, isNew);
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
    const saved = await write("questions", QUESTION_COLUMNS, "id", row, isNew);
    set({
      questions: upsertLocal(get().questions, saved, (q) => q.id === saved.id),
    });
  },
  removeQuestion: async (id) => {
    await remove("questions", "id", id);
    set({ questions: get().questions.filter((q) => q.id !== id) });
  },
  saveEntry: async (row, isNew) => {
    const saved = await write(
      "dictionary",
      DICTIONARY_COLUMNS,
      "english",
      row,
      isNew,
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
