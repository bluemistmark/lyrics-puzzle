import { useGame } from "../../store";

type Props = { onClose: () => void; onCancel: () => void };

export function ResetModal({ onClose, onCancel }: Props) {
  const reset = useGame((s) => s.reset);
  return (
    <>
      <h2>플레이 기록을 지울까요?</h2>
      <p>진행 중인 문제와 누적 기록이 초기화돼요.</p>
      <button
        className="primary"
        onClick={() => {
          reset();
          onClose();
        }}
      >
        기록 초기화
      </button>
      <button className="secondary" onClick={onCancel}>
        취소
      </button>
    </>
  );
}
