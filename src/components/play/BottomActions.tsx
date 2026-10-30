import { ArrowRight, AudioLines } from "../icons";
import { useGame } from "../../store";

type Props = {
  finished: boolean;
  /** Turns the input into the title box; omitted when there is nothing to offer (이지, or already asking). */
  onTitle?: () => void;
};

/** The one main action under the input: 제목 맞히기 while playing, 다음 문제 once finished. */
export function BottomActions({ finished, onTitle }: Props) {
  const next = useGame((s) => s.next);
  if (!finished && !onTitle) return null;
  return (
    <div className="bottom-actions">
      {finished ? (
        <button className="primary" onClick={next}>
          다음 문제 <ArrowRight size={18} />
        </button>
      ) : (
        <button className="primary" onClick={onTitle}>
          <AudioLines size={19} /> 제목 맞히기
        </button>
      )}
    </div>
  );
}
