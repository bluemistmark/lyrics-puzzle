import { useState } from "react";
import type { QuestionRow } from "../data/build-catalog.ts";
import { FormDialog } from "./FormDialog";
import { useAdmin } from "./store";

/**
 * Deleting a published question drops it from players' 도감 and records, and the id
 * can never be reused safely. So this dialog offers 미사용 (hide from the game) first.
 */
export function DeleteQuestionDialog({
  question,
  onClose,
}: {
  question: QuestionRow;
  onClose: () => void;
}) {
  const saveQuestion = useAdmin((s) => s.saveQuestion);
  const removeQuestion = useAdmin((s) => s.removeQuestion);
  const [error, setError] = useState("");
  const remove = async () => {
    if (!confirm(`문제 ${question.id}를 정말 삭제할까요? 되돌릴 수 없어요.`))
      return;
    try {
      await removeQuestion(question.id);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <FormDialog
      title={`문제 ${question.id} 삭제`}
      submitLabel="미사용으로 바꾸기"
      submitDisabled={!question.active}
      onClose={onClose}
      onSubmit={() => saveQuestion({ ...question, active: false }, false)}
    >
      <p>
        게임에 게시된 문제예요. 삭제하면 이 문제를 맞힌 플레이어의 도감·기록에서
        빠지고, 같은 문제ID를 다시 쓰면 기록이 엉뚱한 문제에 붙어요.
      </p>
      <p>
        게임에서만 빼려면 <b>미사용</b>으로 바꾸세요. 다음 게시부터 출제되지
        않고, 필요하면 다시 켤 수 있어요.
      </p>
      {!question.active && (
        <p className="muted">
          이미 미사용이에요. 다음 게시부터 게임에서 빠져요.
        </p>
      )}
      <p>
        <button type="button" className="danger" onClick={remove}>
          그래도 삭제
        </button>
      </p>
      {error && <p className="form-error">{error}</p>}
    </FormDialog>
  );
}
