import { scanLine, type DictionaryEntry } from "../data/english.ts";
import { initial } from "../data/hangul.ts";

/**
 * How the lyrics first look in the game: Hangul as 초성, English as the 초성 of its
 * 표시발음 (underlined), spaces and punctuation as is. Unregistered English is highlighted.
 */
export function LyricsPreview({
  lines,
  sorted,
}: {
  lines: string[];
  /** Must come from `sortDictionary`. */
  sorted: readonly DictionaryEntry[];
}) {
  const shown = lines.map((l) => l.trim()).filter(Boolean);
  if (!shown.length) return null;
  return (
    <div className="lyrics-preview" aria-label="게임 화면 미리보기">
      <small>게임 화면 미리보기</small>
      {shown.map((line, l) => (
        <p key={l}>
          {scanLine(line, sorted).tokens.map((token, w) =>
            token.pronunciation ? (
              <span
                key={w}
                className="english"
                title={`${token.text} → ${token.pronunciation}`}
              >
                {[...token.pronunciation].map(initial).join("")}
              </span>
            ) : /[\p{Script=Latin}]/u.test(token.text) ? (
              <span key={w} className="missing" title="영어 사전에 없는 단어">
                {token.text}
              </span>
            ) : (
              <span key={w}>{[...token.text].map(initial).join("")}</span>
            ),
          )}
        </p>
      ))}
    </div>
  );
}
