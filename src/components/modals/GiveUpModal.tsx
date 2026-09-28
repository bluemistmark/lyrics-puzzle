import { Headphones } from "lucide-react";
import { useGame, type GameMode } from "../../store";

export function GiveUpModal({
  onClose,
  mode = "play",
}: {
  onClose: () => void;
  mode?: GameMode;
}) {
  const giveUp = useGame((s) => s.giveUp);
  return (
    <>
      <span className="modal-icon">
        <Headphones />
      </span>
      <h2>정답 확인</h2>
      <p>
        제목과 가사 전체가 공개됩니다.
        <br />
        {mode === "daily"
          ? "오늘의 문제는 여기서 종료됩니다."
          : "연속 정답 기록은 초기화됩니다."}
      </p>
      <button
        className="primary"
        onClick={() => {
          giveUp(mode);
          onClose();
        }}
      >
        정답 보기
      </button>
      <button className="secondary" onClick={onClose}>
        계속 풀기
      </button>
    </>
  );
}
