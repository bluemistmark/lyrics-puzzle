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
  const playMode = useGame((s) => (mode === "daily" ? "classic" : s.playMode));
  return (
    <>
      <span className="modal-icon">
        <Headphones />
      </span>
      <h2>정답 확인</h2>
      <p>
        {playMode === "simple"
          ? "제목이 공개됩니다."
          : playMode === "easy"
            ? "가사 전체가 공개됩니다."
            : "제목과 가사 전체가 공개됩니다."}
        <br />
        {mode === "daily"
          ? "데일리 퀴즈는 여기서 종료됩니다."
          : playMode === "classic"
            ? "연속 정답 기록은 초기화됩니다."
            : "이 모드는 기록에 남지 않아요."}
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
