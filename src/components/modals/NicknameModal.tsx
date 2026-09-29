import { Trophy } from "lucide-react";
import { useRanking } from "../../ranking";
import { NicknameForm } from "../NicknameForm";

/** Asked once, right after the first daily title is guessed. */
export function NicknameModal({ onClose }: { onClose: () => void }) {
  const skipNickname = useRanking((s) => s.skipNickname);
  return (
    <>
      <span className="modal-icon">
        <Trophy />
      </span>
      <h2>데일리 랭킹에 등록할까요?</h2>
      <p>
        닉네임은 랭킹에 공개돼요. 건너뛰면 순위에는 나오지 않고 참여 인원에만
        익명으로 집계돼요. 닉네임은 오른쪽 위 계정 메뉴에서 언제든 바꿀 수
        있어요.
      </p>
      <NicknameForm submitLabel="랭킹에 등록" onSaved={onClose} />
      <button
        className="secondary"
        onClick={() => {
          skipNickname();
          onClose();
        }}
      >
        건너뛰기
      </button>
    </>
  );
}
