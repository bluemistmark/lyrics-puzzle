import type { Question } from "./game.ts";

// 아는 곡 우선(클래식): 아는 곡은 더 자주, 모르는 곡은 덜 자주 나온다.

/** A song as the player marked it on the result screen. */
export type SongPref = "known" | "unknown";
/**
 * Song id → the latest mark and when it was made (ms). A cleared mark stays as `pref: null`
 * so an account sync doesn't bring the old one back.
 */
export type SongPrefs = Record<string, { pref: SongPref | null; at: number }>;

/** Draw weights, set in the admin 출제 설정 tab (game_settings) and bundled with the catalog. */
export type KnownSettings = {
  /** Weight of a known song (others weigh 1). */
  knownWeight: number;
  /** Weight of a song marked unknown. */
  unknownWeight: number;
  /** Songs with a signal (known or unknown) needed before the draw is weighted. */
  minSignalSongs: number;
};
export const DEFAULT_KNOWN_SETTINGS: KnownSettings = {
  knownWeight: 3,
  unknownWeight: 1 / 3,
  minSignalSongs: 30,
};
/** Allowed ranges, the same as the checks in the game_settings migration. */
export const KNOWN_LIMITS = {
  knownWeight: [1, 10],
  unknownWeight: [0.01, 1],
  minSignalSongs: [0, 1000],
} as const;

/** Problems with the settings, as Korean messages (empty when they can be published). */
export function knownSettingsIssues(s: KnownSettings): string[] {
  const issues: string[] = [];
  const range = (
    value: number,
    [min, max]: readonly [number, number],
    label: string,
  ) => {
    if (!Number.isFinite(value) || value < min || value > max)
      issues.push(`${label}는 ${min} 이상 ${max} 이하여야 합니다.`);
  };
  range(s.knownWeight, KNOWN_LIMITS.knownWeight, "아는 곡 가중치");
  range(s.unknownWeight, KNOWN_LIMITS.unknownWeight, "모르는 곡 가중치");
  range(s.minSignalSongs, KNOWN_LIMITS.minSignalSongs, "적용 기준 곡 수");
  if (!Number.isInteger(s.minSignalSongs))
    issues.push("적용 기준 곡 수는 정수여야 합니다.");
  return issues;
}

/**
 * Known: songs with a question whose title was guessed (곡 도감) or marked known.
 * A song marked unknown is unknown even if it was guessed.
 */
export function songSignals(
  questions: readonly Pick<Question, "id" | "songId">[],
  collected: readonly string[],
  prefs: SongPrefs,
) {
  const done = new Set(collected);
  const known = new Set(
    questions.filter((q) => done.has(q.id)).map((q) => q.songId),
  );
  const unknown = new Set<string>();
  for (const [id, { pref }] of Object.entries(prefs)) {
    if (pref === "known") known.add(id);
    if (pref === "unknown") {
      known.delete(id);
      unknown.add(id);
    }
  }
  return { known, unknown };
}

/** Number of songs with a signal, compared with `minSignalSongs`. */
export function signalCount(
  questions: readonly Pick<Question, "id" | "songId">[],
  collected: readonly string[],
  prefs: SongPrefs,
) {
  const { known, unknown } = songSignals(questions, collected, prefs);
  return known.size + unknown.size;
}

/** Draw weight per song id (others weigh 1), or null while there is too little data. */
export function songWeights(
  questions: readonly Pick<Question, "id" | "songId">[],
  collected: readonly string[],
  prefs: SongPrefs,
  settings: KnownSettings = DEFAULT_KNOWN_SETTINGS,
): Map<string, number> | null {
  const { known, unknown } = songSignals(questions, collected, prefs);
  if (known.size + unknown.size < settings.minSignalSongs) return null;
  const weights = new Map<string, number>();
  for (const id of known) weights.set(id, settings.knownWeight);
  for (const id of unknown) weights.set(id, settings.unknownWeight);
  return weights;
}

/** Picks one item with probability proportional to its weight. `items` must not be empty. */
export function weightedPick<T>(
  items: readonly T[],
  weight: (item: T) => number,
  random = Math.random,
): T {
  const total = items.reduce((n, item) => n + weight(item), 0);
  let r = random() * total;
  for (const item of items) {
    r -= weight(item);
    if (r < 0) return item;
  }
  return items[items.length - 1];
}

/** The later mark of each song wins; on a tie the saved (remote) one. Idempotent. */
export function mergeSongPrefs(
  local: SongPrefs = {},
  remote: SongPrefs = {},
): SongPrefs {
  const out = { ...remote };
  for (const [id, entry] of Object.entries(local))
    if (!out[id] || entry.at > out[id].at) out[id] = entry;
  return out;
}

/** Keeps only well-formed marks (from storage or an account save). */
export function cleanSongPrefs(value: unknown): SongPrefs {
  if (typeof value !== "object" || value === null) return {};
  const out: SongPrefs = {};
  for (const [id, entry] of Object.entries(value)) {
    const { pref, at } = (entry ?? {}) as Partial<SongPrefs[string]>;
    if (
      typeof at === "number" &&
      (pref === "known" || pref === "unknown" || pref === null)
    )
      out[id] = { pref, at };
  }
  return out;
}
