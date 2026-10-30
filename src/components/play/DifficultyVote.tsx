import { RATINGS, useDifficulty, type Rating } from "../../difficulty";
import { toast } from "../../toast";

type Props = { questionId: string; solved: boolean; daily: boolean };

/** 체감 난이도 buttons shown once a question is finished (title guessed or given up). */
export function DifficultyVote({ questionId, solved, daily }: Props) {
  const mine = useDifficulty((s) => s.votes[questionId]);
  const vote = useDifficulty((s) => s.vote);
  // Saved locally first; if the server refuses, the choice is undone and a toast offers
  // to try again.
  const send = (rating: Rating) =>
    vote(questionId, rating, { solved, mode: daily ? "daily" : "play" }).catch(
      (e: Error) =>
        toast(`응답을 저장하지 못했어요. ${e.message}`, {
          error: true,
          action: { label: "다시 시도", run: () => send(rating) },
        }),
    );
  return (
    <div className="difficulty-vote">
      <span id={`difficulty-${questionId}`}>이 문제, 어땠나요?</span>
      <div role="group" aria-labelledby={`difficulty-${questionId}`}>
        {RATINGS.map(([rating, label]) => (
          <button
            key={rating}
            type="button"
            aria-pressed={mine === rating}
            onClick={() => send(rating)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
