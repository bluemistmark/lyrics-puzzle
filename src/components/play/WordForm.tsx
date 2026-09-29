import { useRef, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { useGame, type GameMode } from "../../store";
import { blockComposingEnter } from "../../utils/ime";

export function WordForm({
  disabled,
  mode = "play",
}: {
  disabled: boolean;
  mode?: GameMode;
}) {
  const guess = useGame((s) => s.guess);
  const [word, setWord] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    guess(word, mode);
    setWord("");
    input.current?.focus();
  };
  return (
    <form className="word-form" onSubmit={submit}>
      {/* <label htmlFor={`${mode}-word`}>단어 입력</label> */}
      <div className="input-wrap">
        <input
          ref={input}
          id={`${mode}-word`}
          value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={blockComposingEnter}
          placeholder="가사에 나올 단어"
          autoComplete="off"
          maxLength={60}
          disabled={disabled}
        />
        <button
          type="submit"
          aria-label="단어 확인"
          disabled={!word.trim() || disabled}
        >
          <ArrowRight size={23} />
        </button>
      </div>
    </form>
  );
}
