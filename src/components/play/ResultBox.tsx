import { Check, Headphones } from "lucide-react";
import type { Question } from "../../game";
import type { PlayMode } from "../../modes";
import type { Round } from "../../store";
import { DifficultyVote } from "./DifficultyVote";

type Props = {
  question: Question;
  round: Round;
  full: boolean;
  daily?: boolean;
  playMode?: PlayMode;
};

export function ResultBox({
  question,
  round,
  full,
  daily = false,
  playMode = "classic",
}: Props) {
  const answered = round.solved || round.givenUp;
  return (
    <div className="success-box">
      <span className="success-icon">
        {round.givenUp ? <Headphones size={22} /> : <Check size={22} />}
      </span>
      <div>
        <strong>{answered ? question.title : "가사 완성"}</strong>
        {answered && <p>{question.unit}</p>}
        <p>
          {round.givenUp
            ? daily
              ? "오늘의 문제를 마쳤어요."
              : "다음 문제로 넘어갈 수 있어요."
            : playMode === "easy"
              ? "가사를 모두 채웠어요."
              : playMode === "simple"
                ? "제목을 맞혔어요."
                : round.solved
                  ? full
                    ? "제목과 가사를 모두 맞혔어요."
                    : "남은 가사도 계속 풀 수 있어요."
                  : "이제 제목을 입력하세요."}
        </p>
        {/* Only classic answers count, so the other modes don't skew 체감 난이도. */}
        {answered && playMode === "classic" && (
          <DifficultyVote
            questionId={question.id}
            solved={round.solved}
            daily={daily}
          />
        )}
      </div>
    </div>
  );
}
