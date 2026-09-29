import type { Question, Song } from "./game.ts";

export type SongEntry = {
  song: Song;
  /** Number of questions (lyric sections) for this song. */
  total: number;
  /** Questions of this song whose title the player has guessed. */
  solved: number;
};
export type UnitEntry = { unit: string; songs: SongEntry[]; collected: number };

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
      unit = { unit: song.unit, songs: [], collected: 0 };
      units.set(song.unit, unit);
    }
    unit.songs.push(entry);
    if (entry.solved) unit.collected++;
  }
  return [...units.values()];
}
