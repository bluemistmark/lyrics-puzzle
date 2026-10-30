import { Flag, Headphones } from "../icons";
import { useRound } from "../../hooks/useRound";
import type { GameMode } from "../../store";

type Props = {
  mode?: GameMode;
  onGiveUp: () => void;
  onReport: () => void;
};

/** The ⋯ sheet of a question: 포기 (until it's finished) and 오류 제보. */
export function QuestionMenuModal({
  mode = "play",
  onGiveUp,
  onReport,
}: Props) {
  const { round } = useRound(mode);
  return (
    <div className="menu-list">
      <button
        type="button"
        disabled={round.solved || round.givenUp}
        onClick={onGiveUp}
      >
        <Headphones size={18} aria-hidden="true" /> 포기하고 정답 보기
      </button>
      <button type="button" onClick={onReport}>
        <Flag size={18} aria-hidden="true" /> 이 문제 오류 제보
      </button>
    </div>
  );
}
