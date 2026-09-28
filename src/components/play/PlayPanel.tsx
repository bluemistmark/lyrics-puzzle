import { ChevronDown } from "lucide-react";
import { units } from "../../game";
import { useRound } from "../../hooks/useRound";
import { useGame } from "../../store";
import type { ModalName } from "../Modal";
import { BottomActions } from "./BottomActions";
import { HintButtons } from "./HintButtons";
import { PuzzleCard } from "./PuzzleCard";
import { ResultBox } from "./ResultBox";
import { WordForm } from "./WordForm";
import { WordHistory } from "./WordHistory";

const unitLabel = (selected: string[]) =>
  selected.length === units.length
    ? "NCT 전체"
    : selected.length === 1
      ? selected[0]
      : `${selected.length}개 유닛`;

type Props = { hidden: boolean; onOpenModal: (name: ModalName) => void };

export function PlayPanel({ hidden, onOpenModal }: Props) {
  const { round, question, percent, full } = useRound();
  const selected = useGame((s) => s.selected);
  const notice = useGame((s) => s.notice);
  return (
    <div
      id="play-panel"
      role="tabpanel"
      aria-labelledby="play-tab"
      hidden={hidden}
    >
      <div className="game-toolbar">
        <h1>지금 도전 중</h1>
        <button
          className="filter"
          aria-label={`유닛 선택, 현재 ${unitLabel(selected)}`}
          onClick={() => onOpenModal("units")}
        >
          유닛 · {unitLabel(selected)}
          <ChevronDown size={15} />
        </button>
      </div>
      <PuzzleCard
        question={question}
        round={round}
        percent={percent}
        full={full}
      />
      {(round.solved || round.givenUp || full) && (
        <ResultBox question={question} round={round} full={full} />
      )}
      {/* Remount per question so the draft word is cleared. */}
      <WordForm key={round.id} disabled={round.givenUp || full} />
      <div className="feedback" role="status">
        {notice}
      </div>
      <WordHistory words={round.words} />
      <HintButtons question={question} round={round} full={full} />
      <BottomActions
        finished={round.solved || round.givenUp}
        onTitle={() => onOpenModal("title")}
        onGiveUp={() => onOpenModal("giveup")}
      />
    </div>
  );
}
