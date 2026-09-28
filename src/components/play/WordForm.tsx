import { useRef, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { useGame } from "../../store";
import { blockComposingEnter } from "../../utils/ime";

export function WordForm({ disabled }: { disabled: boolean }) {
  const guess = useGame((s) => s.guess);
  const [word, setWord] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    guess(word);
    setWord("");
    input.current?.focus();
  };
  return (
    <form className="word-form" onSubmit={submit}>
      <label htmlFor="word">떠오르는 단어</label>
      <div className="input-wrap">
        <input
          ref={input}
          id="word"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={blockComposingEnter}
          placeholder="가사에 있을 것 같은 단어"
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
