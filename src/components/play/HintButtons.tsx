import { Check, Sparkles } from "lucide-react";
import type { Question } from "../../game";
import { useGame, type Round } from "../../store";

type Props = { question: Question; round: Round; full: boolean };

export function HintButtons({ question, round, full }: Props) {
  const hint = useGame((s) => s.hint);
  const locked = round.givenUp || full;
  const hasEnglish = question.lines.some((line) =>
    line.some((t) => t.pronunciation),
  );
  return (
    <div className="hints">
      <div>
        <button
          disabled={round.english || locked || !hasEnglish}
          onClick={() => hint("english")}
        >
          {round.english ? (
            <Check size={14} />
          ) : (
            <span className="english-a">A</span>
          )}{" "}
          영어 표시
        </button>
        <button disabled={locked} onClick={() => hint("word")}>
          <Sparkles size={14} /> 단어 공개
        </button>
      </div>
    </div>
  );
}
