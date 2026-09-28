import { initial, type Question } from "../../game";

type Props = {
  question: Question;
  /** Reveal keys from `matches`/`allKeys` (`line:token:char` or `line:token:en`). */
  revealed: string[];
  /** Show the full lyrics (after giving up) without marking them as found. */
  showAll: boolean;
  /** Underline English tokens (english hint). */
  markEnglish: boolean;
};

export function Lyrics({ question, revealed, showAll, markEnglish }: Props) {
  const shown = (key: string) => showAll || revealed.includes(key);
  return (
    <div className="lyrics" aria-label="문제 가사">
      {question.lines.map((line, l) => (
        <p key={l}>
          {line.map((token, w) => {
            const english = Boolean(token.pronunciation) && markEnglish;
            return (
              <span
                key={w}
                className={`word ${english ? "english" : ""}`}
                aria-label={english ? "영어 구간" : undefined}
              >
                {token.pronunciation ? (
                  <span
                    className={
                      revealed.includes(`${l}:${w}:en`) ? "revealed" : ""
                    }
                  >
                    {shown(`${l}:${w}:en`)
                      ? token.text
                      : [...token.pronunciation].map(initial).join("")}
                  </span>
                ) : (
                  [...token.text].map((c, i) => (
                    <span
                      key={i}
                      className={
                        revealed.includes(`${l}:${w}:${i}`) ? "revealed" : ""
                      }
                    >
                      {shown(`${l}:${w}:${i}`) ? c : initial(c)}
                    </span>
                  ))
                )}
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
}
