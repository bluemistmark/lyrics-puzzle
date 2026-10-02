import { useState } from "react";
import { Flag } from "lucide-react";
import {
  GENERAL_KINDS,
  QUESTION_KINDS,
  REPORT_KINDS,
  REPORT_MAX,
  sendReport,
  type ReportKind,
} from "../../report";
import { playRound, useGame, type GameMode } from "../../store";

type Props = {
  /** Set when opened from a question screen: that question is attached. */
  mode?: GameMode;
  onClose: () => void;
};

/** 오류 제보. Asks for no contact details; replies go out through the 소식 tab. */
export function ReportModal({ mode, onClose }: Props) {
  const questionId = useGame((s) =>
    mode === "daily" ? s.daily.round.id : mode ? playRound(s).id : undefined,
  );
  const kinds = REPORT_KINDS.filter(([kind]) =>
    (mode ? QUESTION_KINDS : GENERAL_KINDS).includes(kind),
  );
  const [kind, setKind] = useState<ReportKind>(kinds[0][0]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent)
    return (
      <>
        <span className="modal-icon">
          <Flag />
        </span>
        <h2>제보해 줘서 고마워요!</h2>
        <p>확인해서 고칠게요. 반영되면 소식으로 알려 드려요.</p>
        <button className="primary" onClick={onClose}>
          닫기
        </button>
      </>
    );

  return (
    <>
      <span className="modal-icon">
        <Flag />
      </span>
      <h2>{mode ? "이 문제 오류 제보" : "오류·의견 보내기"}</h2>
      <p>
        {mode
          ? "지금 풀고 있는 문제 정보가 함께 전송돼요. "
          : "문제와 상관없는 오류나 의견을 보내 주세요. "}
        연락처 등 개인정보는 적지 말아 주세요.
      </p>
      <form
        className="report-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError("");
          try {
            await sendReport({ kind, message, questionId, mode });
            setSent(true);
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setPending(false);
          }
        }}
      >
        <fieldset>
          <legend>종류</legend>
          <div className="report-kinds">
            {kinds.map(([value, label]) => (
              <label
                key={value}
                className={kind === value ? "selected" : undefined}
              >
                <input
                  type="radio"
                  name="report-kind"
                  value={value}
                  checked={kind === value}
                  onChange={() => setKind(value)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <label htmlFor="report-message">내용</label>
        <textarea
          id="report-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={REPORT_MAX}
          rows={5}
          placeholder={
            mode
              ? "예) 두 번째 줄 '그대'가 원곡에서는 '너'예요."
              : "예) 테마 창이 닫히지 않아요."
          }
        />
        <p className="report-count">
          {message.length} / {REPORT_MAX}
        </p>
        <p className="error" role="status">
          {error}
        </p>
        <button className="primary" disabled={pending || !message.trim()}>
          {pending ? "보내는 중…" : "제보 보내기"}
        </button>
      </form>
      <button className="secondary" onClick={onClose}>
        취소
      </button>
    </>
  );
}
