import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  achievementList,
  earnedAchievements,
  emptyFeats,
  recordGiveUp,
  recordSolve,
  type Feats,
} from "./achievements.ts";
import { dailyQuestionId, koreaDate, type DailyHistory } from "./daily.ts";
import { useDifficulty } from "./difficulty.ts";
import {
  allKeys,
  matches,
  normalize,
  titleMatches,
  pickQuestion,
  progress,
  questions,
  songs,
  units,
} from "./game.ts";
import { isPlayMode, type PlayMode } from "./modes.ts";
import { useRanking } from "./ranking.ts";
export type Stats = {
  solved: number;
  completed: number;
  direct: number;
  skipped: number;
  streak: number;
  best: number;
};
export type Round = {
  id: string;
  revealed: string[];
  words: { word: string; hit: boolean }[];
  solved: boolean;
  givenUp: boolean;
  english: boolean;
  artist: boolean;
  hints: number;
  wordHints: number;
  counted: boolean;
  /** When the question appeared (업적 "번개"); missing on rounds saved before it. */
  startedAt?: number;
};
export type GameMode = "play" | "daily";
/** 단어 공개 hints per question in classic rules (the play tab's classic and the daily challenge). */
export const WORD_HINT_LIMIT = 5;
export type DailyState = { date: string; round: Round; notice: string };
/** Progress of one non-classic play mode (classic keeps `round`/`seen` from older saves). */
export type ModeState = { round: Round; seen: string[] };
type SideMode = Exclude<PlayMode, "classic">;
const newRound = (id: string): Round => ({
  id,
  revealed: [],
  words: [],
  solved: false,
  givenUp: false,
  english: false,
  artist: false,
  hints: 0,
  wordHints: 0,
  counted: false,
  startedAt: Date.now(),
});
const newDailyState = (date: string): DailyState => ({
  date,
  round: newRound(
    dailyQuestionId(
      date,
      questions.map((q) => q.id),
    ),
  ),
  notice: "",
});
const newModeState = (): ModeState => {
  const q = pickQuestion(units, []);
  return { round: newRound(q.id), seen: [q.id] };
};
const newModes = (): Record<SideMode, ModeState> => ({
  simple: newModeState(),
  easy: newModeState(),
});
type PlayRounds = Pick<Store, "playMode" | "round" | "seen" | "modes">;
/** The play tab's current round in the chosen mode. */
export const playRound = (s: PlayRounds) =>
  s.playMode === "classic" ? s.round : s.modes[s.playMode].round;
const playSeen = (s: PlayRounds) =>
  s.playMode === "classic" ? s.seen : s.modes[s.playMode].seen;
/** State change that stores the play tab's round (and `seen`) for the chosen mode. */
const playPatch = (
  s: PlayRounds,
  round: Round,
  seen = playSeen(s),
): Partial<Store> =>
  s.playMode === "classic"
    ? { round, seen }
    : { modes: { ...s.modes, [s.playMode]: { round, seen } } };
const filled = (round: Round) => {
  const q = questions.find((q) => q.id === round.id)!;
  const p = progress(q, round.revealed);
  return p.count === p.total;
};
const emptyStats = (): Stats => ({
  solved: 0,
  completed: 0,
  direct: 0,
  skipped: 0,
  streak: 0,
  best: 0,
});
const complete = (round: Round, stats: Stats) => {
  const q = questions.find((q) => q.id === round.id)!;
  const p = progress(q, round.revealed);
  if (p.count === p.total && !round.counted && !round.givenUp) {
    round.counted = true;
    stats.completed++;
    if (!round.wordHints) stats.direct++;
  }
};
const recordDaily = (
  history: DailyHistory,
  date: string,
  round: Round,
): DailyHistory =>
  history[date]
    ? history
    : {
        ...history,
        [date]: {
          solved: round.solved,
          guesses: round.words.length,
          hints: round.hints,
        },
      };
/** Today's challenge can't be replayed, so a finished one always stays recorded. */
const todayHistory = (
  daily: DailyState,
  history: DailyHistory = {},
): DailyHistory =>
  history[daily.date]
    ? { [daily.date]: history[daily.date] }
    : daily.round.solved || daily.round.givenUp
      ? recordDaily({}, daily.date, daily.round)
      : {};
/** Counts a finished classic question (title or give up) on today's date. */
const logPlay = (log: PlayLog): PlayLog => {
  const date = koreaDate();
  return { ...log, [date]: (log[date] ?? 0) + 1 };
};
export type PlayLog = Record<string, number>;
export const ACHIEVEMENTS = achievementList({ songs, questions });
/** Achievements reached by the given records, keeping earlier unlock dates. */
/** Records an account sync reads and replaces. */
export type SyncedRecords = Pick<
  Store,
  | "stats"
  | "collected"
  | "dailyHistory"
  | "playLog"
  | "feats"
  | "themes"
  | "achievements"
  | "resetAt"
>;
type Records = Pick<
  Store,
  "stats" | "collected" | "dailyHistory" | "playLog" | "feats" | "themes"
>;
/** Everything achievements are judged on; two facts come from the ranking and 난이도 stores. */
export const achievementInput = (s: Records) => ({
  stats: s.stats,
  collected: s.collected,
  dailyHistory: s.dailyHistory,
  playLog: s.playLog,
  feats: s.feats,
  themes: s.themes,
  votes: Object.keys(useDifficulty.getState().votes).length,
  hasNickname: Boolean(useRanking.getState().nickname),
  today: koreaDate(),
});
const earned = (s: Records, achievements: Record<string, string>) =>
  earnedAchievements(ACHIEVEMENTS, achievementInput(s), achievements);
type Store = {
  selected: string[];
  /** Classic mode's seen questions and round (top level for older saves). */
  seen: string[];
  round: Round;
  /** Mode of the play tab; only classic adds to records, 도감 and achievements. */
  playMode: PlayMode;
  modes: Record<SideMode, ModeState>;
  daily: DailyState;
  stats: Stats;
  /** Question ids whose title was guessed in classic or the daily challenge (곡 도감). */
  collected: string[];
  /** First finish (title or give up) of each day's daily challenge. */
  dailyHistory: DailyHistory;
  /** Normal-mode questions finished per Korean date (플레이 잔디). */
  playLog: PlayLog;
  /** Counters kept only for achievements (see achievements.ts). */
  feats: Feats;
  /** Theme choices used at least once (업적 "패셔니스타"). */
  themes: string[];
  /** When records were last reset (ms, 0 = never); the newer reset wins an account sync. */
  resetAt: number;
  /** Achievement id → Korean date it was first reached. */
  achievements: Record<string, string>;
  /** Achievements reached during this visit, for the toast (not persisted). */
  justUnlocked: string[];
  notice: string;
  guess: (word: string, mode?: GameMode) => void;
  solve: (title: string, mode?: GameMode) => boolean;
  hint: (type: "english" | "word" | "artist", mode?: GameMode) => void;
  giveUp: (mode?: GameMode) => void;
  syncDaily: (date: string) => void;
  next: () => void;
  setPlayMode: (mode: PlayMode) => void;
  /** Opens a shared question (?q=…&mode=…) as the current round of that mode; false if unknown. */
  openQuestion: (id: string, mode: PlayMode) => boolean;
  select: (selected: string[]) => void;
  reset: () => void;
  /** Clears the toast (it shows every achievement reached so far at once). */
  dismissUnlocked: () => void;
  /** Records a theme choice. */
  noteTheme: (theme: string) => void;
  /** Re-judges achievements after another store (ranking, 난이도) changed. */
  checkAchievements: () => void;
  /** Replaces records with ones merged from the account (see account/save.ts); no toasts. */
  loadRecords: (records: SyncedRecords) => void;
};
const firstQuestion = pickQuestion(units, []);
export const useGame = create<Store>()(
  persist(
    (rawSet, get) => {
      // Every state change may reach an achievement, so all actions go through this `set`.
      const set = ((...args: Parameters<typeof rawSet>) => {
        rawSet(...args);
        const s = get();
        const achievements = earned(s, s.achievements);
        const fresh = Object.keys(achievements).filter(
          (id) => !s.achievements[id],
        );
        if (fresh.length)
          rawSet({
            achievements,
            justUnlocked: [...s.justUnlocked, ...fresh],
          });
      }) as typeof rawSet;
      return {
        selected: units,
        seen: [firstQuestion.id],
        round: newRound(firstQuestion.id),
        playMode: "classic",
        modes: newModes(),
        daily: newDailyState(koreaDate()),
        stats: emptyStats(),
        collected: [],
        dailyHistory: {},
        playLog: {},
        feats: emptyFeats(),
        themes: [],
        resetAt: 0,
        achievements: {},
        justUnlocked: [],
        notice: "",
        guess: (word, mode = "play") => {
          const s = get();
          const current = mode === "daily" ? s.daily.round : playRound(s);
          const style = mode === "daily" ? "classic" : s.playMode;
          if (style === "simple") {
            set({ notice: "심플 모드는 가사가 모두 공개돼 있어요." });
            return;
          }
          if (current.givenUp) return;
          const text = word.trim().slice(0, 60);
          if (!text) return;
          const found = matches(
            questions.find((q) => q.id === current.id)!,
            text,
            current.revealed,
          );
          const added = found.filter((k) => !current.revealed.includes(k));
          if (
            !added.length &&
            current.words.some((w) => normalize(w.word) === normalize(text))
          ) {
            const notice = "이미 입력한 단어예요.";
            set(
              mode === "daily" ? { daily: { ...s.daily, notice } } : { notice },
            );
            return;
          }
          const round = {
            ...current,
            revealed: [...new Set([...current.revealed, ...found])],
            words: [...current.words, { word: text, hit: found.length > 0 }],
          };
          const notice = added.length
            ? "일치하는 가사가 공개됐어요."
            : found.length
              ? "이미 공개된 부분이에요."
              : "일치하는 단어가 없어요.";
          if (mode === "daily") set({ daily: { ...s.daily, round, notice } });
          else if (style === "classic") {
            const stats = { ...s.stats };
            complete(round, stats);
            set({ round, stats, notice });
          } else {
            round.solved = filled(round);
            set({
              ...playPatch(s, round),
              notice: round.solved ? "가사를 모두 채웠어요." : notice,
            });
          }
        },
        solve: (title, mode = "play") => {
          const s = get();
          const current = mode === "daily" ? s.daily.round : playRound(s);
          const style = mode === "daily" ? "classic" : s.playMode;
          if (current.solved || current.givenUp || style === "easy")
            return false;
          const q = questions.find((q) => q.id === current.id)!;
          if (!titleMatches(q, title)) {
            const notice = "제목이 일치하지 않아요.";
            set(
              mode === "daily" ? { daily: { ...s.daily, notice } } : { notice },
            );
            return false;
          }
          if (style === "simple") {
            set({
              ...playPatch(s, { ...current, solved: true }),
              notice: "제목 정답. 다음 문제로 넘어갈 수 있어요.",
            });
            return true;
          }
          const collected = s.collected.includes(q.id)
            ? s.collected
            : [...s.collected, q.id];
          const feats = recordSolve(s.feats, {
            mode,
            unit: q.unit,
            words: current.words.length,
            hasEnglish: q.lines.some((line) =>
              line.some((t) => t.pronunciation),
            ),
            usedEnglishHint: current.english,
            startedAt: current.startedAt,
            now: Date.now(),
          });
          if (mode === "daily") {
            const round = { ...current, solved: true };
            set({
              collected,
              feats,
              dailyHistory: recordDaily(s.dailyHistory, s.daily.date, round),
              daily: {
                ...s.daily,
                round,
                notice: "제목 정답. 결과를 공유할 수 있어요.",
              },
            });
            return true;
          }
          const streak = s.stats.streak + 1;
          set({
            collected,
            feats,
            playLog: logPlay(s.playLog),
            round: { ...current, solved: true },
            stats: {
              ...s.stats,
              solved: s.stats.solved + 1,
              streak,
              best: Math.max(streak, s.stats.best),
            },
            notice: "제목 정답. 남은 가사도 풀 수 있어요.",
          });
          return true;
        },
        hint: (type, mode = "play") => {
          const s = get();
          const current = mode === "daily" ? s.daily.round : playRound(s);
          const style = mode === "daily" ? "classic" : s.playMode;
          if (current.givenUp) return;
          // 심플 shows the lyrics and 이지 the artist, so those hints don't apply.
          if (style === "simple" && type !== "artist") return;
          if (style === "easy" && type === "artist") return;
          const round = { ...current, revealed: [...current.revealed] };
          if (type === "english") {
            if (round.english) return;
            round.english = true;
          } else if (type === "artist") {
            if (round.artist) return;
            round.artist = true;
          } else {
            if (style === "classic" && round.wordHints >= WORD_HINT_LIMIT)
              return;
            const q = questions.find((q) => q.id === round.id)!;
            const hidden = allKeys(q).find((k) => !round.revealed.includes(k));
            if (!hidden) return;
            const prefix = hidden.split(":").slice(0, 2).join(":") + ":";
            round.revealed = [
              ...new Set([
                ...round.revealed,
                ...allKeys(q).filter((k) => k.startsWith(prefix)),
              ]),
            ];
            round.wordHints++;
          }
          round.hints++;
          const notice =
            type === "english"
              ? "영어 구간을 표시했어요."
              : type === "artist"
                ? "가수명을 공개했어요."
                : "단어 하나를 공개했어요.";
          if (mode === "daily") set({ daily: { ...s.daily, round, notice } });
          else if (style === "classic") {
            const stats = { ...s.stats };
            complete(round, stats);
            set({ round, stats, notice });
          } else {
            if (style === "easy") round.solved = filled(round);
            set({
              ...playPatch(s, round),
              notice: round.solved ? "가사를 모두 채웠어요." : notice,
            });
          }
        },
        giveUp: (mode = "play") => {
          const s = get();
          const current = mode === "daily" ? s.daily.round : playRound(s);
          if (current.givenUp || current.solved) return;
          if (mode === "daily") {
            const round = { ...current, givenUp: true };
            set({
              dailyHistory: recordDaily(s.dailyHistory, s.daily.date, round),
              daily: {
                ...s.daily,
                round,
                notice: "오늘의 문제가 종료됐어요.",
              },
            });
            return;
          }
          if (s.playMode !== "classic") {
            set({
              ...playPatch(s, { ...current, givenUp: true }),
              notice: "정답을 확인했어요.",
            });
            return;
          }
          set({
            playLog: logPlay(s.playLog),
            feats: recordGiveUp(s.feats),
            round: { ...current, givenUp: true },
            stats: { ...s.stats, skipped: s.stats.skipped + 1, streak: 0 },
            notice: "정답을 확인했어요.",
          });
        },
        syncDaily: (date) => {
          if (get().daily.date !== date) set({ daily: newDailyState(date) });
        },
        next: () => {
          const s = get();
          const round = playRound(s);
          const seenIds = playSeen(s);
          if (!round.solved && !round.givenUp) return;
          const q = pickQuestion(s.selected, seenIds, round.id);
          const pool = questions.filter((q) => s.selected.includes(q.unit));
          const seen = pool.every((q) => seenIds.includes(q.id))
            ? [q.id]
            : [...seenIds, q.id];
          set({ ...playPatch(s, newRound(q.id), seen), notice: "" });
        },
        setPlayMode: (playMode) => {
          if (playMode !== get().playMode) set({ playMode, notice: "" });
        },
        openQuestion: (id, playMode) => {
          if (!questions.some((q) => q.id === id)) return false;
          const target = { ...get(), playMode };
          if (playRound(target).id === id) {
            set({ playMode, notice: "" });
            return true;
          }
          const seen = playSeen(target);
          set({
            playMode,
            ...playPatch(
              target,
              newRound(id),
              seen.includes(id) ? seen : [...seen, id],
            ),
            notice: "공유받은 문제예요. 같은 문제에 도전해 보세요!",
          });
          return true;
        },
        select: (selected) => {
          if (selected.length)
            set({ selected, notice: "선택한 범위는 다음 문제부터 적용돼요." });
        },
        reset: () => {
          const q = pickQuestion(units, []);
          const records = {
            stats: emptyStats(),
            collected: [],
            dailyHistory: todayHistory(get().daily, get().dailyHistory),
            playLog: {},
            feats: emptyFeats(),
            // Theme use is a preference history, not a play record, so it survives a reset.
            themes: get().themes,
            resetAt: Date.now(),
          };
          rawSet({
            ...records,
            // Re-earned quietly: only what today's kept daily result still reaches.
            achievements: earned(records, {}),
            justUnlocked: [],
            round: newRound(q.id),
            modes: newModes(),
            selected: units,
            seen: [q.id],
            notice: "기록을 초기화했어요.",
          });
        },
        dismissUnlocked: () => rawSet({ justUnlocked: [] }),
        noteTheme: (theme) => {
          if (!get().themes.includes(theme))
            set({ themes: [...get().themes, theme] });
        },
        checkAchievements: () => set({}),
        loadRecords: (records) =>
          rawSet({
            ...records,
            achievements: earned(records, records.achievements),
          }),
      };
    },
    {
      name: "chosung-lyrics-live-v1",
      version: 1,
      partialize: ({ notice, justUnlocked, ...s }) => ({
        ...s,
        daily: { ...s.daily, notice: "" },
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<Store> | undefined;
        if (!p || !p.round || !questions.some((q) => q.id === p.round?.id))
          return current;
        const selected = Array.isArray(p.selected)
          ? p.selected.filter((u) => units.includes(u))
          : units;
        const daily =
          p.daily?.date === koreaDate() &&
          questions.some((q) => q.id === p.daily?.round?.id)
            ? { ...p.daily, notice: "" }
            : current.daily;
        // Saves from before 곡 도감 start with whatever is solved right now.
        const collected = Array.isArray(p.collected)
          ? p.collected
          : [
              ...new Set(
                [p.round, daily.round].filter((r) => r.solved).map((r) => r.id),
              ),
            ];
        const dailyHistory =
          p.dailyHistory && typeof p.dailyHistory === "object"
            ? p.dailyHistory
            : todayHistory(daily);
        const modes = { ...current.modes };
        for (const m of ["simple", "easy"] as const) {
          const saved = p.modes?.[m];
          if (saved?.round && questions.some((q) => q.id === saved.round.id))
            modes[m] = {
              round: saved.round,
              seen: Array.isArray(saved.seen) ? saved.seen : [saved.round.id],
            };
        }
        const records = {
          stats: { ...current.stats, ...p.stats },
          collected,
          dailyHistory,
          playLog: p.playLog && typeof p.playLog === "object" ? p.playLog : {},
          feats: { ...emptyFeats(), ...p.feats },
          themes: Array.isArray(p.themes) ? p.themes : [],
          resetAt: typeof p.resetAt === "number" ? p.resetAt : 0,
        };
        return {
          ...current,
          ...p,
          ...records,
          selected: selected.length ? selected : units,
          playMode: isPlayMode(p.playMode) ? p.playMode : "classic",
          modes,
          daily,
          // Saves from before 업적 get what they already reached, without toasts.
          achievements: earned(
            records,
            p.achievements && typeof p.achievements === "object"
              ? p.achievements
              : {},
          ),
          justUnlocked: [],
          notice: "",
        };
      },
    },
  ),
);

// Persist the first randomly selected question even before the player makes a move.
// Otherwise a refresh on the untouched opening screen would draw another question.
if (typeof window !== "undefined") {
  try {
    if (!window.localStorage.getItem("chosung-lyrics-live-v1")) {
      useGame.setState({ seen: [...useGame.getState().seen] });
    }
  } catch {
    /* Private browsing may disable storage. */
  }
}

// Nickname and 체감 난이도 answers live in their own stores; judge again when they change.
useRanking.subscribe(() => useGame.getState().checkAchievements());
useDifficulty.subscribe(() => useGame.getState().checkAchievements());
