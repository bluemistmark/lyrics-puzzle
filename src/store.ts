import { create } from "zustand";
import { persist } from "zustand/middleware";
import { dailyQuestionId, koreaDate } from "./daily.ts";
import {
  allKeys,
  matches,
  normalize,
  titleMatches,
  pickQuestion,
  progress,
  questions,
  units,
} from "./game.ts";
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
};
export type GameMode = "play" | "daily";
export type DailyState = { date: string; round: Round; notice: string };
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
type Store = {
  selected: string[];
  seen: string[];
  round: Round;
  daily: DailyState;
  stats: Stats;
  notice: string;
  guess: (word: string, mode?: GameMode) => void;
  solve: (title: string, mode?: GameMode) => boolean;
  hint: (type: "english" | "word" | "artist", mode?: GameMode) => void;
  giveUp: (mode?: GameMode) => void;
  syncDaily: (date: string) => void;
  next: () => void;
  select: (selected: string[]) => void;
  reset: () => void;
};
const firstQuestion = pickQuestion(units, []);
export const useGame = create<Store>()(
  persist(
    (set, get) => ({
      selected: units,
      seen: [firstQuestion.id],
      round: newRound(firstQuestion.id),
      daily: newDailyState(koreaDate()),
      stats: emptyStats(),
      notice: "",
      guess: (word, mode = "play") => {
        const s = get();
        const current = mode === "daily" ? s.daily.round : s.round;
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
          const notice = "이미 찾아본 단어예요. 새로 열리는 부분이 없어요.";
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
          ? "좋아요! 숨겨진 가사를 찾았어요."
          : found.length
            ? "이미 공개된 가사예요."
            : "이 구간에는 없는 단어예요. 다시 도전해 봐요.";
        if (mode === "daily") set({ daily: { ...s.daily, round, notice } });
        else {
          const stats = { ...s.stats };
          complete(round, stats);
          set({ round, stats, notice });
        }
      },
      solve: (title, mode = "play") => {
        const s = get();
        const current = mode === "daily" ? s.daily.round : s.round;
        if (current.solved || current.givenUp) return false;
        const q = questions.find((q) => q.id === current.id)!;
        if (!titleMatches(q, title)) {
          const notice = "아직 정답이 아니에요. 가사를 조금 더 채워 보세요.";
          set(
            mode === "daily" ? { daily: { ...s.daily, notice } } : { notice },
          );
          return false;
        }
        if (mode === "daily") {
          set({
            daily: {
              ...s.daily,
              round: { ...current, solved: true },
              notice: "오늘의 문제 정답! 결과를 공유해 보세요.",
            },
          });
          return true;
        }
        const streak = s.stats.streak + 1;
        set({
          round: { ...current, solved: true },
          stats: {
            ...s.stats,
            solved: s.stats.solved + 1,
            streak,
            best: Math.max(streak, s.stats.best),
          },
          notice: "제목 정답! 남은 가사도 계속 채울 수 있어요.",
        });
        return true;
      },
      hint: (type, mode = "play") => {
        const s = get();
        const current = mode === "daily" ? s.daily.round : s.round;
        if (current.givenUp) return;
        const round = { ...current, revealed: [...current.revealed] };
        if (type === "english") {
          if (round.english) return;
          round.english = true;
        } else if (type === "artist") {
          if (round.artist) return;
          round.artist = true;
        } else {
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
            ? "영어 부분에 보라색 밑줄을 표시했어요."
            : type === "artist"
              ? "가수명을 공개했어요."
              : "숨겨진 단어 하나를 공개했어요.";
        if (mode === "daily") set({ daily: { ...s.daily, round, notice } });
        else {
          const stats = { ...s.stats };
          complete(round, stats);
          set({ round, stats, notice });
        }
      },
      giveUp: (mode = "play") => {
        const s = get();
        const current = mode === "daily" ? s.daily.round : s.round;
        if (current.givenUp || current.solved) return;
        if (mode === "daily") {
          set({
            daily: {
              ...s.daily,
              round: { ...current, givenUp: true },
              notice: "내일 새로운 문제에서 다시 만나요.",
            },
          });
          return;
        }
        set({
          round: { ...current, givenUp: true },
          stats: { ...s.stats, skipped: s.stats.skipped + 1, streak: 0 },
          notice: "괜찮아요. 다음 노래에서 다시 만나요.",
        });
      },
      syncDaily: (date) => {
        if (get().daily.date !== date) set({ daily: newDailyState(date) });
      },
      next: () => {
        const s = get();
        if (!s.round.solved && !s.round.givenUp) return;
        const q = pickQuestion(s.selected, s.seen, s.round.id);
        const pool = questions.filter((q) => s.selected.includes(q.unit));
        const seen = pool.every((q) => s.seen.includes(q.id))
          ? [q.id]
          : [...s.seen, q.id];
        set({ round: newRound(q.id), seen, notice: "" });
      },
      select: (selected) => {
        if (selected.length)
          set({ selected, notice: "선택한 범위는 다음 문제부터 적용돼요." });
      },
      reset: () => {
        const q = pickQuestion(units, []);
        set({
          stats: emptyStats(),
          round: newRound(q.id),
          selected: units,
          seen: [q.id],
          notice: "기록을 초기화했어요.",
        });
      },
    }),
    {
      name: "chosung-lyrics-live-v1",
      version: 1,
      partialize: ({ notice, ...s }) => ({
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
        return {
          ...current,
          ...p,
          selected: selected.length ? selected : units,
          daily:
            p.daily?.date === koreaDate() &&
            questions.some((q) => q.id === p.daily?.round?.id)
              ? { ...p.daily, notice: "" }
              : current.daily,
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
