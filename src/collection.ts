import type { Question, Song } from "./game.ts";

export type SongEntry = {
  song: Song;
  /** Number of questions (lyric sections) for this song. */
  total: number;
  /** Questions of this song whose title the player has guessed. */
  solved: number;
};
export type UnitEntry = {
  unit: string;
  /** An NCT unit (see `Song.main`); others show under "다른 가수". */
  main: boolean;
  songs: SongEntry[];
  collected: number;
};

/**
 * Groups songs by unit in catalog order. A song counts as collected once any of its
 * questions was solved. Songs without questions and unknown question ids are ignored.
 */
export function buildCollection(
  songs: readonly Song[],
  questions: readonly Pick<Question, "id" | "songId">[],
  collected: readonly string[],
): UnitEntry[] {
  const done = new Set(collected);
  const units = new Map<string, UnitEntry>();
  for (const song of songs) {
    const own = questions.filter((q) => q.songId === song.id);
    if (!own.length) continue;
    const entry = {
      song,
      total: own.length,
      solved: own.filter((q) => done.has(q.id)).length,
    };
    let unit = units.get(song.unit);
    if (!unit) {
      unit = { unit: song.unit, main: song.main, songs: [], collected: 0 };
      units.set(song.unit, unit);
    }
    unit.songs.push(entry);
    if (entry.solved) unit.collected++;
  }
  return [...units.values()];
}

/** Ids of the songs whose title was guessed, most recent first (`collected` grows in the
 *  order titles were guessed). */
export function recentSongIds(
  questions: readonly Pick<Question, "id" | "songId">[],
  collected: readonly string[],
): string[] {
  const songOf = new Map(questions.map((q) => [q.id, q.songId]));
  const ids = [...collected]
    .reverse()
    .map((id) => songOf.get(id))
    .filter((id) => id !== undefined);
  return [...new Set(ids)];
}

/** Up to `max` different 앨범아트 of the unit's guessed songs, the latest first (songs of one
 *  album share a cover). Songs not guessed yet never give theirs: it would give them away. */
export function unitArts(
  unit: UnitEntry,
  recent: readonly string[],
  max = 4,
): string[] {
  const art = new Map(
    unit.songs.filter((s) => s.solved).map((s) => [s.song.id, s.song.art]),
  );
  const arts = recent
    .map((id) => art.get(id))
    .filter((src) => src !== undefined);
  return [...new Set(arts)].slice(0, max);
}
