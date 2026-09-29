import { create } from "zustand";
import { persist } from "zustand/middleware";
import { requestJson, useRanking } from "./ranking.ts";

// 체감 난이도 응답 (게임 쪽). 서버는 api/difficulty.ts, DB는 supabase/migrations/*_difficulty.sql.
// Uses the ranking's anonymous token; a failed request only shows a message.

export type Rating = "easy" | "normal" | "hard";
/** Order and labels of the buttons. api/difficulty.ts mirrors the values. */
export const RATINGS: [Rating, string][] = [
  ["easy", "쉬워요"],
  ["normal", "보통이에요"],
  ["hard", "어려워요"],
];

type DifficultyStore = {
  /** My answer per question id, so the buttons show it again later. */
  votes: Record<string, Rating>;
  /** Saves locally first; reverts and throws if the server rejects it. */
  vote: (
    questionId: string,
    rating: Rating,
    context: { solved: boolean; mode: "play" | "daily" },
  ) => Promise<void>;
};

export const useDifficulty = create<DifficultyStore>()(
  persist(
    (set, get) => ({
      votes: {},
      vote: async (questionId, rating, context) => {
        const previous = get().votes[questionId];
        if (previous === rating) return;
        set((s) => ({ votes: { ...s.votes, [questionId]: rating } }));
        try {
          await requestJson("/api/difficulty", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              token: useRanking.getState().ensureToken(),
              questionId,
              rating,
              ...context,
            }),
          });
        } catch (error) {
          set((s) => {
            const votes = { ...s.votes };
            if (previous) votes[questionId] = previous;
            else delete votes[questionId];
            return { votes };
          });
          throw error;
        }
      },
    }),
    { name: "lyrics-difficulty-v1" },
  ),
);
