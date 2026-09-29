import { AudioLines } from "lucide-react";
import { dailySummary } from "../../daily";
import { useRound } from "../../hooks/useRound";
import { useGame } from "../../store";
import type { ModalName } from "../Modal";
import { HintButtons } from "./HintButtons";
import { PuzzleCard } from "./PuzzleCard";
import { ResultBox } from "./ResultBox";
import { ShareResults } from "./ShareResults";
import { WordForm } from "./WordForm";
import { WordHistory } from "./WordHistory";

type Props = { hidden: boolean; onOpenModal: (name: ModalName) => void };

export function DailyPanel({ hidden, onOpenModal }: Props) {
  const { round, question, percent, full } = useRound("daily");
  const daily = useGame((s) => s.daily);
  const history = useGame((s) => s.dailyHistory);
  const finished = round.solved || round.givenUp;
  return (
    <section
      id="daily-panel"
      role="tabpanel"
      aria-labelledby="daily-tab"
      hidden={hidden}
      className="daily-panel"
    >
      <div className="daily-heading">
        <div>
          <span className="daily-date">{daily.date.replaceAll("-", ".")}</span>
          <h1>오늘의 문제</h1>
        </div>
        <span className="daily-badge">하루 한 곡</span>
      </div>
      <PuzzleCard
        question={question}
        round={round}
        percent={percent}
        full={full}
      />
      {(finished || full) && (
        <ResultBox question={question} round={round} full={full} daily />
      )}
      <WordForm
        key={`daily-${daily.date}-${round.id}`}
        mode="daily"
        disabled={round.givenUp || full}
      />
      <div className="feedback" role="status">
        {daily.notice}
      </div>
      <WordHistory words={round.words} />
      <HintButtons question={question} round={round} full={full} mode="daily" />
      {finished ? (
        <ShareResults
          date={daily.date}
          round={round}
          percent={percent}
          streak={dailySummary(history, daily.date).current}
        />
      ) : (
        <div className="bottom-actions">
          <button
            className="primary"
            onClick={() => onOpenModal("daily-title")}
          >
            <AudioLines size={19} /> 제목 맞히기
          </button>
          <button className="skip" onClick={() => onOpenModal("daily-giveup")}>
            포기하기
          </button>
        </div>
      )}
    </section>
  );
}
