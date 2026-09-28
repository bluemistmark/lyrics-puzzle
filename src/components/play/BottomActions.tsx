import { ArrowRight, AudioLines } from "lucide-react";
import { useGame } from "../../store";

type Props = { finished: boolean; onTitle: () => void; onGiveUp: () => void };

export function BottomActions({ finished, onTitle, onGiveUp }: Props) {
  const next = useGame((s) => s.next);
  return (
    <div className="bottom-actions">
      {finished ? (
        <button className="primary" onClick={next}>
          다음 문제 <ArrowRight size={18} />
        </button>
      ) : (
        <>
          <button className="primary" onClick={onTitle}>
            <AudioLines size={19} /> 제목 맞히기
          </button>
          <button className="skip" onClick={onGiveUp}>
            포기하기
          </button>
        </>
      )}
    </div>
  );
}
