import { useState } from "react";
import { RATINGS, useDifficulty } from "../../difficulty";

type Props = { questionId: string; solved: boolean; daily: boolean };

/** 체감 난이도 buttons shown once a question is finished (title guessed or given up). */
export function DifficultyVote({ questionId, solved, daily }: Props) {
  const mine = useDifficulty((s) => s.votes[questionId]);
  const vote = useDifficulty((s) => s.vote);
  const [error, setError] = useState("");
  return (
    <div className="difficulty-vote">
      <span id={`difficulty-${questionId}`}>
        {mine ? "답변해주셔서 감사해요! 더 나은 게임을 만들어 갈게요" : "이 문제, 어땠나요?"}
      </span>
      <div role="group" aria-labelledby={`difficulty-${questionId}`}>
        {RATINGS.map(([rating, label]) => (
          <button
            key={rating}
            type="button"
            aria-pressed={mine === rating}
            onClick={() => {
              setError("");
              vote(questionId, rating, {
                solved,
                mode: daily ? "daily" : "play",
              }).catch((e: Error) =>
                setError(`응답을 저장하지 못했어요. ${e.message}`),
              );
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p className="difficulty-error" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
