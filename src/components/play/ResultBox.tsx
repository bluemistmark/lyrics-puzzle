import { Check, Headphones } from "lucide-react";
import type { Question } from "../../game";
import type { Round } from "../../store";

type Props = {
  question: Question;
  round: Round;
  full: boolean;
  daily?: boolean;
};

export function ResultBox({ question, round, full, daily = false }: Props) {
  const answered = round.solved || round.givenUp;
  return (
    <div className="success-box">
      <span className="success-icon">
        {round.givenUp ? <Headphones size={22} /> : <Check size={22} />}
      </span>
      <div>
        <strong>{answered ? question.title : "가사를 모두 채웠어요!"}</strong>
        {answered && <p>{question.unit}</p>}
        <p>
          {round.givenUp
            ? daily
              ? "정답을 확인했어요. 내일 새 문제에 도전해 보세요."
              : "정답을 확인했어요. 다음 문제에 도전해 보세요."
            : round.solved
              ? full
                ? "제목도 가사도 모두 맞혔어요!"
                : "제목 정답! 남은 가사도 계속 풀 수 있어요."
              : "이제 노래 제목에도 도전해 보세요."}
        </p>
      </div>
    </div>
  );
}
