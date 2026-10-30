import { useEffect, useState } from "react";
import { isNewSong } from "../../collectionSeen";
import { Celebration } from "../Celebration";
import { toast } from "../../toast";
import { ChevronDown } from "../icons";
import { mainUnits, units } from "../../game";
import { useRound } from "../../hooks/useRound";
import { playModeName } from "../../modes";
import { useGame } from "../../store";
import type { ModalName } from "../Modal";
import { BottomActions } from "./BottomActions";
import { HintButtons } from "./HintButtons";
import { PuzzleCard } from "./PuzzleCard";
import { QuestionActions } from "./QuestionActions";
import { ResultBox } from "./ResultBox";
import { WordForm } from "./WordForm";

const sameUnits = (a: string[], b: string[]) =>
  a.length === b.length && b.every((u) => a.includes(u));
const unitLabel = (selected: string[]) =>
  sameUnits(selected, mainUnits)
    ? "NCT 전체"
    : sameUnits(selected, units)
      ? "전체"
      : selected.length === 1
        ? selected[0]
        : `${selected.length}개 선택`;

type Props = { hidden: boolean; onOpenModal: (name: ModalName) => void };

export function PlayPanel({ hidden, onOpenModal }: Props) {
  const { round, question, percent, full } = useRound();
  const selected = useGame((s) => s.selected);
  const playMode = useGame((s) => s.playMode);
  const notice = useGame((s) => s.notice);
  const modeName = playModeName(playMode);
  const finished = round.solved || round.givenUp;
  // The question whose 제목 맞히기 is open; another question means it's closed again.
  const [titleFor, setTitleFor] = useState<string | null>(null);
  // A note from the store (a lap of the pool and the like) shows once as a toast.
  useEffect(() => {
    if (!notice) return;
    toast(notice);
    useGame.setState({ notice: "" });
  }, [notice]);
  // Each guessed title plays the celebration once (a new key remounts it), naming the
  // playlist when the song is new to the 도감.
  const [celebrations, setCelebrations] = useState(0);
  const [added, setAdded] = useState<string | null>(null);
  const collected = useGame((s) => s.collected);
  const celebrate = () => {
    setAdded(
      playMode === "classic" && isNewSong(collected, question.songId)
        ? question.unit
        : null,
    );
    setCelebrations((n) => n + 1);
  };
  const canTitle = playMode !== "easy" && !finished;
  // 심플 only asks for the title, so its box always does.
  const asking =
    canTitle && (playMode === "simple" || titleFor === round.id)
      ? "title"
      : "word";
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
            aria-label={`플레이 설정, 현재 ${modeName} · ${unitLabel(selected)}`}
            onClick={() => onOpenModal("play-options")}
          >
            {modeName} · {unitLabel(selected)}
            <ChevronDown size={15} />
          </button>
          <QuestionActions
            onShare={() => onOpenModal("share")}
            onMenu={() => onOpenModal("menu")}
          />
        </div>
      </div>
      <PuzzleCard
        question={question}
        round={round}
        percent={percent}
        playMode={playMode}
      />
      {(finished || full) && (
        <ResultBox question={question} round={round} playMode={playMode} />
      )}
      {/* Input and actions; themes may pin this to the bottom (라이트). Once the title is
          known only the next step and a small box for the rest of the lyrics stay. */}
      <div className={finished ? "play-dock finished" : "play-dock"}>
        {/* Remount per mode, question and word/title so the draft is cleared. */}
        {(playMode !== "simple" || !finished) && (
          <WordForm
            key={`${playMode}-${round.id}-${asking}`}
            disabled={round.givenUp || full}
            asking={asking}
            onCancelTitle={
              playMode === "simple" ? undefined : () => setTitleFor(null)
            }
            onSolved={celebrate}
          />
        )}
        {!finished && (
          <HintButtons
            question={question}
            round={round}
            full={full}
            playMode={playMode}
          />
        )}
        <BottomActions
          finished={finished}
          onTitle={
            canTitle && asking === "word"
              ? () => setTitleFor(round.id)
              : undefined
          }
        />
      </div>
      {celebrations > 0 && (
        <Celebration
          key={celebrations}
          caption={added ? `${added} 플레이리스트에 추가됨` : undefined}
        />
      )}
    </div>
  );
}
