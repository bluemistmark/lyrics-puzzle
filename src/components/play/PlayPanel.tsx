import { ChevronDown } from "lucide-react";
import { units } from "../../game";
import { useRound } from "../../hooks/useRound";
import { playModeName } from "../../modes";
import { useGame } from "../../store";
import type { ModalName } from "../Modal";
import { BottomActions } from "./BottomActions";
import { HintButtons } from "./HintButtons";
import { PuzzleCard } from "./PuzzleCard";
import { ReportLink } from "./ReportLink";
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
  const playMode = useGame((s) => s.playMode);
  const notice = useGame((s) => s.notice);
  const modeName = playModeName(playMode);
  return (
    <div
      id="play-panel"
      role="tabpanel"
      aria-labelledby="play-tab"
      hidden={hidden}
    >
      <div className="game-toolbar">
        <div className="toolbar-filters">
          <button
            className="filter"
            aria-label={`모드 선택, 현재 ${modeName}`}
            onClick={() => onOpenModal("modes")}
          >
            <span className="filter-prefix">모드 · </span>
            {modeName}
            <ChevronDown size={15} />
          </button>
          <button
            className="filter"
            aria-label={`유닛 선택, 현재 ${unitLabel(selected)}`}
            onClick={() => onOpenModal("units")}
          >
            <span className="filter-prefix">유닛 · </span>
            {unitLabel(selected)}
            <ChevronDown size={15} />
          </button>
        </div>
      </div>
      <PuzzleCard
        question={question}
        round={round}
        percent={percent}
        full={full}
        playMode={playMode}
      />
      {(round.solved || round.givenUp || full) && (
        <ResultBox
          question={question}
          round={round}
          full={full}
          playMode={playMode}
        />
      )}
      {/* Remount per mode and question so the draft word is cleared. */}
      {playMode !== "simple" && (
        <WordForm
          key={`${playMode}-${round.id}`}
          disabled={round.givenUp || full}
        />
      )}
      <div className="feedback" role="status">
        {notice}
      </div>
      {playMode !== "simple" && <WordHistory words={round.words} />}
      <HintButtons
        question={question}
        round={round}
        full={full}
        playMode={playMode}
      />
      <BottomActions
        finished={round.solved || round.givenUp}
        onTitle={playMode === "easy" ? undefined : () => onOpenModal("title")}
        onGiveUp={() => onOpenModal("giveup")}
      />
      <ReportLink onClick={() => onOpenModal("report")} />
    </div>
  );
}
