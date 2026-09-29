import { progress, questions } from "../game";
import { playRound, useGame, type GameMode } from "../store";

/** Current round together with its question and completion progress. */
export function useRound(mode: GameMode = "play") {
  const round = useGame((s) =>
    mode === "daily" ? s.daily.round : playRound(s),
  );
  const question = questions.find((q) => q.id === round.id)!;
  const { count, total } = progress(question, round.revealed);
  return {
    round,
    question,
    percent: Math.round((count / total) * 100),
    full: count === total,
  };
}
