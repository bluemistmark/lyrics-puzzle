import { initial, type Question } from "../../game";

type Props = {
  question: Question;
  /** Reveal keys from `matches`/`allKeys` (`line:token:char` or `line:token:en`). */
  revealed: string[];
  /** Show the full lyrics (after giving up) without marking them as found. */
  showAll: boolean;
  /** Underline English tokens (english hint). */
  markEnglish: boolean;
  /** [시작, 끝) 줄만 보여 준다. 키의 줄 번호는 전체 기준 그대로다. */
  range?: [number, number];
};

export function Lyrics({
  question,
  revealed,
  showAll,
  markEnglish,
  range,
}: Props) {
  const shown = (key: string) => showAll || revealed.includes(key);
  return (
    <div className="lyrics" aria-label="문제 가사">
      {question.lines.map((line, l) =>
        range && (l < range[0] || l >= range[1]) ? null : (
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
        ),
      )}
    </div>
  );
}
