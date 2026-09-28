import type { Catalog } from "./build-catalog.ts";

// Row shape of the `releases` table (see supabase/migrations).
export type ReleaseSong = { id: string; title: string; artist: string };
export type ReleaseRow = {
  id: number;
  created_at: string;
  features: string[];
  note: string;
  added_songs: ReleaseSong[];
  added_questions: number;
  removed_questions: number;
  song_ids: string[];
  question_ids: string[];
};
export type ReleaseDraft = Omit<ReleaseRow, "id" | "created_at">;

/** One entry of the game's 소식 tab (bundled into src/catalog.ts). */
export type NewsItem = {
  id: number;
  date: string;
  features: string[];
  note: string;
  addedSongs: { title: string; artist: string }[];
  addedQuestions: number;
  removedQuestions: number;
};

export const RELEASE_COLUMNS =
  "id,created_at,features,note,added_songs,added_questions,removed_questions,song_ids,question_ids";
/** How many recent entries the game bundles. */
export const NEWS_LIMIT = 30;

const lines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/**
 * What this publish adds compared with the previous one.
 * Without a previous release there is nothing to compare against, so the first
 * publish only records a baseline (otherwise every song would look "new").
 */
export function draftRelease(
  catalog: Catalog,
  previous: ReleaseRow | undefined,
  features: string,
  note: string,
): ReleaseDraft {
  const songIds = catalog.songs.map((s) => s.id);
  const questionIds = catalog.questions.map((q) => q.id);
  const base = {
    features: lines(features),
    note: note.trim(),
    song_ids: songIds,
    question_ids: questionIds,
  };
  if (!previous)
    return {
      ...base,
      added_songs: [],
      added_questions: 0,
      removed_questions: 0,
    };
  const prevSongs = new Set(previous.song_ids);
  const prevQuestions = new Set(previous.question_ids);
  const current = new Set(questionIds);
  return {
    ...base,
    added_songs: catalog.songs
      .filter((s) => !prevSongs.has(s.id))
      .map((s) => ({ id: s.id, title: s.title, artist: s.artist })),
    added_questions: questionIds.filter((id) => !prevQuestions.has(id)).length,
    removed_questions: previous.question_ids.filter((id) => !current.has(id))
      .length,
  };
}

/** Whether a release has anything worth showing to players. */
export const hasNews = (r: ReleaseDraft) =>
  r.features.length > 0 ||
  r.note.length > 0 ||
  r.added_songs.length > 0 ||
  r.added_questions > 0 ||
  r.removed_questions > 0;

/** Newest first, empty baseline releases dropped. */
export function toNews(rows: ReleaseRow[]): NewsItem[] {
  return [...rows]
    .sort((a, b) => b.id - a.id)
    .filter(hasNews)
    .slice(0, NEWS_LIMIT)
    .map((r) => ({
      id: r.id,
      date: r.created_at,
      features: r.features,
      note: r.note,
      addedSongs: r.added_songs.map(({ title, artist }) => ({ title, artist })),
      addedQuestions: r.added_questions,
      removedQuestions: r.removed_questions,
    }));
}
