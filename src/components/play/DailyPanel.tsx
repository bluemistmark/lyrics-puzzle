import { useEffect, useState } from "react";
import { isNewSong } from "../../collectionSeen";
import { Celebration } from "../Celebration";
import { toast } from "../../toast";
import { AudioLines } from "../icons";
import { dailySummary } from "../../daily";
import { useRound } from "../../hooks/useRound";
import { useGame } from "../../store";
import type { ModalName } from "../Modal";
import { HintButtons } from "./HintButtons";
import { PuzzleCard } from "./PuzzleCard";
import { QuestionActions } from "./QuestionActions";
import { DailyRanking } from "./DailyRanking";
import { ResultBox } from "./ResultBox";
import { WordForm } from "./WordForm";

type Props = {
  hidden: boolean;
  onOpenModal: (name: ModalName) => void;
  /** After today's title is guessed (the nickname question). */
  onSolve: () => void;
};

export function DailyPanel({ hidden, onOpenModal, onSolve }: Props) {
  const { round, question, percent, full } = useRound("daily");
  const daily = useGame((s) => s.daily);
  const history = useGame((s) => s.dailyHistory);
  const finished = round.solved || round.givenUp;
  // While today's is open, `current` counts the run up to yesterday.
  const streak = dailySummary(history, daily.date).current;
  // The question whose 제목 맞히기 is open; another day's question means it's closed again.
  const [titleFor, setTitleFor] = useState<string | null>(null);
  // A note from the store (a lap of the pool and the like) shows once as a toast.
  useEffect(() => {
    if (!daily.notice) return;
    toast(daily.notice);
    useGame.setState((s) => ({ daily: { ...s.daily, notice: "" } }));
  }, [daily.notice]);
  // Each guessed title plays the celebration once (a new key remounts it), naming the
  // playlist when the song is new to the 도감.
  const [celebrations, setCelebrations] = useState(0);
  const [added, setAdded] = useState<string | null>(null);
  const collected = useGame((s) => s.collected);
  const celebrate = () => {
    setAdded(isNewSong(collected, question.songId) ? question.unit : null);
    setCelebrations((n) => n + 1);
  };
  const asking = !finished && titleFor === round.id ? "title" : "word";
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
          <h1>데일리 퀴즈</h1>
        </div>
        <div className="daily-heading-side">
          {!finished && streak > 0 && (
            <span className="daily-badge">{`오늘 풀면 ${streak + 1}일 연속`}</span>
          )}
          <QuestionActions
            onShare={() => onOpenModal("daily-share")}
            onMenu={() => onOpenModal("daily-menu")}
          />
        </div>
      </div>
      <PuzzleCard question={question} round={round} percent={percent} />
      {(finished || full) && (
        <ResultBox question={question} round={round} daily />
      )}
      {/* Input and actions; themes may pin this to the bottom (라이트). */}
      <div className="play-dock">
        <WordForm
          key={`daily-${daily.date}-${round.id}-${asking}`}
          mode="daily"
          disabled={round.givenUp || full}
          asking={asking}
          onCancelTitle={() => setTitleFor(null)}
          onSolved={() => {
            celebrate();
            onSolve();
          }}
        />
        <HintButtons
          question={question}
          round={round}
          full={full}
          mode="daily"
        />
        {!finished && asking === "word" && (
          <div className="bottom-actions">
            <button className="primary" onClick={() => setTitleFor(round.id)}>
              <AudioLines size={19} /> 제목 맞히기
            </button>
          </div>
        )}
      </div>
      {finished && (
        <DailyRanking
          key={daily.date}
          date={daily.date}
          result={history[daily.date]}
          onOpenModal={onOpenModal}
        />
      )}
      {celebrations > 0 && (
        <Celebration
          key={celebrations}
          caption={added ? `${added} 플레이리스트에 추가됨` : undefined}
        />
      )}
    </section>
  );
}
