import { Headphones } from "lucide-react";
import { useGame } from "../../store";

export function GiveUpModal({ onClose }: { onClose: () => void }) {
  const giveUp = useGame((s) => s.giveUp);
  return (
    <>
      <span className="modal-icon">
        <Headphones />
      </span>
      <h2>정답을 확인할까요?</h2>
      <p>
        제목과 가사 전체가 공개되고,
        <br />
        연속 정답 기록이 초기화돼요.
      </p>
      <button
        className="primary"
        onClick={() => {
          giveUp();
          onClose();
        }}
      >
        정답 확인하기
      </button>
      <button className="secondary" onClick={onClose}>
        조금 더 풀어볼게요
      </button>
    </>
  );
}
