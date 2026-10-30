import { useState, type FormEvent } from "react";
import { Trash2 } from "../icons";
import { customQuestion, MAX_LINES, MAX_TITLE_LENGTH } from "../../custom";
import { useCustom, type CustomPuzzle } from "../../customStore";
import { progress } from "../../game";

type Props = { puzzles: CustomPuzzle[]; onOpen: (id: string) => void };

export function CustomList({ puzzles, onOpen }: Props) {
  const add = useCustom((s) => s.add);
  const remove = useCustom((s) => s.remove);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = add(title, text);
    if (!result.ok) return setError(result.error);
    setTitle("");
    setText("");
    setError("");
    onOpen(result.id);
  };
  return (
    <>
      <div className="game-toolbar">
        <h1>내 가사로 초성 퍼즐</h1>
        <p className="custom-note">
          붙여 넣은 가사가 초성 퍼즐이 돼요. 이 기기에만 저장돼요.
        </p>
      </div>
      <form className="custom-form" onSubmit={submit}>
        <label htmlFor="custom-title">곡 제목</label>
        <div className="input-wrap">
          <input
            id="custom-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={MAX_TITLE_LENGTH}
            placeholder="제목을 입력해주세요"
            autoComplete="off"
          />
        </div>
        <label htmlFor="custom-text">가사</label>
        <textarea
          id="custom-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={`한 줄에 한 문장씩 (최대 ${MAX_LINES}줄)`}
        />
        <div className="feedback" role="status">
          {error}
        </div>
        <button type="submit" className="custom-submit" disabled={!text.trim()}>
          퍼즐 만들기
        </button>
      </form>
      {puzzles.length > 0 && (
        <ul className="custom-list" aria-label="내 가사 목록">
          {puzzles.map((p) => {
            const { count, total } = progress(
              customQuestion(p.id, p.title, p.lines),
              p.revealed,
            );
            const percent = Math.floor((count / total) * 100);
            return (
              <li key={p.id}>
                <button className="custom-open" onClick={() => onOpen(p.id)}>
                  <strong>{p.title}</strong>
                  <span>{percent}%</span>
                </button>
                {removing === p.id ? (
                  <button
                    className="custom-confirm"
                    onClick={() => {
                      remove(p.id);
                      setRemoving(null);
                    }}
                  >
                    정말 삭제
                  </button>
                ) : (
                  <button
                    className="custom-remove"
                    aria-label={`${p.title} 삭제`}
                    onClick={() => setRemoving(p.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
