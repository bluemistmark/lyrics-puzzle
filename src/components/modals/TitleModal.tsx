import { useState } from "react";
import { ArrowRight, AudioLines } from "lucide-react";
import { useGame, type GameMode } from "../../store";
import { blockComposingEnter } from "../../utils/ime";

export function TitleModal({
  onClose,
  mode = "play",
}: {
  onClose: () => void;
  mode?: GameMode;
}) {
  const solve = useGame((s) => s.solve);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  return (
    <>
      <span className="modal-icon">
        <AudioLines />
      </span>
      <h2>노래 제목 입력</h2>
      <p>제목을 맞힌 뒤에도 가사를 계속 풀 수 있어요.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (solve(title, mode)) onClose();
          else setError("제목이 일치하지 않아요.");
        }}
      >
        <label htmlFor="title">노래 제목</label>
        <input
          id="title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={blockComposingEnter}
          placeholder="제목을 입력하세요"
          maxLength={80}
        />
        <p className="error" role="status">
          {error}
        </p>
        <button className="primary" disabled={!title.trim()}>
          정답 확인 <ArrowRight size={18} />
        </button>
      </form>
    </>
  );
}
