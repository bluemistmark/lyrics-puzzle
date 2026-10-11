import type { Feats } from "../achievements.ts";
import type { DailyHistory } from "../daily.ts";
import type { Rating } from "../difficulty.ts";
import type { ModeStats, Round, Stats } from "../store.ts";

// 계정에 저장하는 기록(player_saves.data)과 두 기기의 기록을 합치는 규칙.
// Merging is idempotent (max / union / earliest), so syncing the same data again changes nothing.

export type RankingSave = {
  token: string;
  nickname: string;
  submitted: string;
  asked: boolean;
};
/** Today's daily challenge as shown on the 데일리 tab, so another device opens it in the same state. */
export type DailySave = { date: string; round: Round };
export type SaveData = {
  version: 1;
  /** When records were last reset (ms); the side with the newer reset wins. */
  resetAt: number;
  stats: Stats;
  collected: string[];
  dailyHistory: DailyHistory;
  playLog: Record<string, number>;
  feats: Feats;
  achievements: Record<string, string>;
  /** Not cleared by a reset. */
  themes: string[];
  votes: Record<string, Rating>;
  ranking: RankingSave;
  /** 심플·이지 results; missing in saves made before play modes. */
  modeStats?: ModeStats;
  /** Missing in saves made before the daily round was synced. */
  daily?: DailySave;
};
type Records = Pick<
  SaveData,
  | "stats"
  | "collected"
  | "dailyHistory"
  | "playLog"
  | "feats"
  | "achievements"
  | "modeStats"
>;

const noModeStats: ModeStats = {
  simple: { solved: 0, givenUp: 0 },
  easy: { solved: 0, givenUp: 0 },
};
const mergeModeStats = (
  local: ModeStats = noModeStats,
  remote: ModeStats = noModeStats,
): ModeStats => ({
  simple: maxEach(local.simple, remote.simple),
  easy: maxEach(local.easy, remote.easy),
});

const union = (a: readonly string[], b: readonly string[]) => [
  ...new Set([...a, ...b]),
];
function maxEach<T extends Record<string, number>>(a: T, b: T): T {
  const out: Record<string, number> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, v);
  return out as T;
}

const mergeFeats = (local: Feats, remote: Feats): Feats => ({
  noWord: Math.max(local.noWord, remote.noWord),
  oneWord: Math.max(local.oneWord, remote.oneWord),
  noEnglish: Math.max(local.noEnglish, remote.noEnglish),
  fast: Math.max(local.fast, remote.fast),
  night: Math.max(local.night, remote.night),
  unitBest: Math.max(local.unitBest, remote.unitBest),
  // The current unit run only makes sense on the device being played.
  unit: local.unit,
  unitRun: local.unitRun,
});

function mergeRecords(local: Records, remote: Records): Records {
  const achievements = { ...local.achievements };
  for (const [id, date] of Object.entries(remote.achievements))
    if (!achievements[id] || date < achievements[id]) achievements[id] = date;
  return {
    stats: maxEach(local.stats, remote.stats),
    collected: union(remote.collected, local.collected),
    // The first finish of a day counts; the saved one came first.
    dailyHistory: { ...local.dailyHistory, ...remote.dailyHistory },
    playLog: maxEach(local.playLog, remote.playLog),
    feats: mergeFeats(local.feats, remote.feats),
    achievements,
    modeStats: mergeModeStats(local.modeStats, remote.modeStats),
  };
}

const finished = (r: Round) => r.solved || r.givenUp;
const effort = (r: Round) => r.words.length + r.hints;
/**
 * The daily round to keep. A newer day wins; on the same day a finished round wins
 * (the saved one if both finished, like `dailyHistory`), otherwise the one further along,
 * so a round started on one device can be continued on another.
 */
export function mergeDaily(
  local: DailySave | undefined,
  remote: DailySave | undefined,
): DailySave | undefined {
  if (!local || !remote) return local ?? remote;
  if (local.date !== remote.date)
    return local.date > remote.date ? local : remote;
  // Different questions on the same day means the devices run different catalogs.
  if (local.round.id !== remote.round.id) return local;
  if (finished(remote.round)) return remote;
  if (finished(local.round)) return local;
  return effort(remote.round) > effort(local.round) ? remote : local;
}

/** Local device state merged with the account's save (null before the first sync). */
export function mergeSaves(local: SaveData, remote: SaveData | null): SaveData {
  if (!remote) return local;
  const records =
    local.resetAt === remote.resetAt
      ? mergeRecords(local, remote)
      : local.resetAt > remote.resetAt
        ? local
        : remote;
  // Every device adopts the account's ranking token so they rank as one player.
  const ranking = remote.ranking.token
    ? { ...remote.ranking, asked: remote.ranking.asked || local.ranking.asked }
    : local.ranking;
  return {
    version: 1,
    resetAt: Math.max(local.resetAt, remote.resetAt),
    stats: records.stats,
    collected: records.collected,
    dailyHistory: records.dailyHistory,
    playLog: records.playLog,
    feats: records.feats,
    achievements: records.achievements,
    modeStats: records.modeStats ?? noModeStats,
    themes: union(remote.themes, local.themes),
    // This device's latest answer wins.
    votes: { ...remote.votes, ...local.votes },
    ranking,
    daily: mergeDaily(local.daily, remote.daily),
  };
}

const isDailySave = (x: unknown): x is DailySave => {
  if (typeof x !== "object" || x === null) return false;
  const { date, round } = x as Partial<DailySave>;
  return (
    typeof date === "string" &&
    typeof round === "object" &&
    round !== null &&
    typeof round.id === "string" &&
    Array.isArray(round.revealed) &&
    Array.isArray(round.words) &&
    typeof round.solved === "boolean" &&
    typeof round.givenUp === "boolean" &&
    typeof round.hints === "number"
  );
};

/** A malformed daily round only drops the round, not the whole save. */
const withDaily = ({ daily, ...save }: SaveData): SaveData =>
  isDailySave(daily) ? { ...save, daily } : save;

/** Accepts only saves with the expected shape; anything else is treated as no save. */
export function parseSave(value: unknown): SaveData | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Partial<SaveData>;
  const object = (x: unknown) => typeof x === "object" && x !== null;
  return v.version === 1 &&
    typeof v.resetAt === "number" &&
    object(v.stats) &&
    Array.isArray(v.collected) &&
    object(v.dailyHistory) &&
    object(v.playLog) &&
    object(v.feats) &&
    object(v.achievements) &&
    Array.isArray(v.themes) &&
    object(v.votes) &&
    object(v.ranking)
    ? withDaily(v as SaveData)
    : null;
}
