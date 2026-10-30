import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, X } from "../icons";
import { normalize } from "../../game";
import { GUESS_MESSAGES, playRound, useGame, type GameMode } from "../../store";
import { blockComposingEnter } from "../../utils/ime";
import { shake } from "../../utils/shake";

type Props = {
  /** Word input only (the question is finished or fully revealed); a title can still be asked. */
  disabled: boolean;
  mode?: GameMode;
  /** The same box takes either a lyric word or the song title (제목 맞히기). */
  asking?: "word" | "title";
  /** Back to word input; omitted where the box only takes titles (심플). */
  onCancelTitle?: () => void;
  /** After a correct title. */
  onSolved?: () => void;
};

export function WordForm({
  disabled,
  mode = "play",
  asking = "word",
  onCancelTitle,
  onSolved,
}: Props) {
  const guess = useGame((s) => s.guess);
  const solve = useGame((s) => s.solve);
  const words = useGame((s) =>
    mode === "daily" ? s.daily.round.words : playRound(s).words,
  );
  const title = asking === "title";
  const [word, setWord] = useState("");
  // The result in words, for screen readers only: the screen shows a reveal or a shake.
  const [status, setStatus] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  // The draft was already guessed: marked in the box instead of listing past words.
  const entered =
    !title &&
    word.trim() !== "" &&
    words.some((w) => normalize(w.word) === normalize(word));
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (entered) return;
    if (title) {
      if (solve(word, mode)) {
        setStatus("");
        onSolved?.();
      } else {
        shake(wrap.current);
        setStatus("제목이 일치하지 않아요.");
      }
    } else {
      const result = guess(word, mode);
      if (result !== "added") shake(wrap.current);
      setStatus(GUESS_MESSAGES[result]);
      setWord("");
    }
    input.current?.focus();
  };
  const className = ["input-wrap", entered && "entered", title && "title-mode"]
    .filter(Boolean)
    .join(" ");
  return (
    <form className="word-form" onSubmit={submit}>
      <div ref={wrap} className={className}>
        <input
          ref={input}
          id={`${mode}-word`}
          value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => {
            blockComposingEnter(e);
            if (e.key === "Escape" && title && onCancelTitle) {
              e.preventDefault();
              onCancelTitle();
            }
          }}
          placeholder={title ? "노래 제목" : "가사에 나올 단어"}
          aria-label={title ? "노래 제목" : "가사 단어"}
          autoComplete="off"
          // Switching to the title box comes from a button press: keep typing there.
          autoFocus={title && Boolean(onCancelTitle)}
          maxLength={title ? 80 : 60}
          disabled={!title && disabled}
          aria-describedby={entered ? `${mode}-word-entered` : undefined}
        />
        {entered && (
          <span className="entered-mark" id={`${mode}-word-entered`}>
            <Check size={14} aria-hidden="true" />
            입력함
          </span>
        )}
        {title && onCancelTitle && (
          <button
            type="button"
            className="title-cancel"
            aria-label="제목 입력 취소"
            onClick={onCancelTitle}
          >
            <X size={18} />
          </button>
        )}
        <button
          type="submit"
          aria-label={title ? "제목 확인" : "단어 확인"}
          disabled={!word.trim() || (!title && disabled) || entered}
        >
          <ArrowRight size={23} />
        </button>
      </div>
      <span className="sr-only" role="status">
        {status}
      </span>
    </form>
  );
}
