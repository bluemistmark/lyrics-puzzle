import { Check } from "lucide-react";
import type { Question } from "../../game";
import type { Round } from "../../store";
import { Lyrics } from "./Lyrics";

type Props = {
  question: Question;
  round: Round;
  percent: number;
  full: boolean;
};

export function PuzzleCard({ question, round, percent, full }: Props) {
  return (
    <section className="puzzle-card" aria-label="초성 가사 문제">
      <div className="card-top">
        <span className="question-label">
          초성 가사 <span>{question.lines.length}줄 문제</span>
        </span>
      </div>
      <Lyrics
        question={question}
        revealed={round.revealed}
        showAll={round.givenUp}
        markEnglish={round.english}
      />
      <div
        className="progress-track"
        role="progressbar"
        aria-label="가사 복원율"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-label">
        <span>
          {round.givenUp ? "정답 공개" : full ? "가사 완성" : "가사 복원"}
        </span>
        <b>{round.givenUp ? "—" : `${percent}%`}</b>
      </div>
      <div className="card-bottom">
        <span className="small-status">
          {round.solved ? (
            <>
              <Check size={15} /> 제목 정답
            </>
          ) : (
            <>
              <span className="status-dot" />
              {round.givenUp
                ? "문제 종료"
                : full
                  ? "제목만 남았어요"
                  : "진행 중"}
            </>
          )}
        </span>
        <span>힌트 {round.hints}회</span>
      </div>
    </section>
  );
}
