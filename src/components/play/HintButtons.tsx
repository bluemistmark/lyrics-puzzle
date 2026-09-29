import { Check, Languages, Mic2, Sparkles } from "lucide-react";
import type { Question } from "../../game";
import type { PlayMode } from "../../modes";
import {
  useGame,
  WORD_HINT_LIMIT,
  type GameMode,
  type Round,
} from "../../store";

type Props = {
  question: Question;
  round: Round;
  full: boolean;
  mode?: GameMode;
  playMode?: PlayMode;
};

export function HintButtons({
  question,
  round,
  full,
  mode = "play",
  playMode = "classic",
}: Props) {
  const hint = useGame((s) => s.hint);
  const locked = round.givenUp || full;
  // 심플 already shows the lyrics and 이지 the artist.
  const lyricHints = playMode !== "simple";
  const artistHint = playMode !== "easy";
  // Only classic rules limit 단어 공개; 이지 is for filling the lyrics in freely.
  const wordsLeft =
    playMode === "classic" ? WORD_HINT_LIMIT - round.wordHints : Infinity;
  const hasEnglish = question.lines.some((line) =>
    line.some((t) => t.pronunciation),
  );
  return (
    <>
      <div className="hints">
        {lyricHints && (
          <button
            disabled={round.english || locked || !hasEnglish}
            onClick={() => hint("english", mode)}
          >
            {round.english ? (
              <Check size={14} />
            ) : (
              <Languages size={14} className="english-a" />
            )}{" "}
            영어 표시
          </button>
        )}
        {artistHint && (
          <button
            disabled={round.artist || locked}
            onClick={() => hint("artist", mode)}
          >
            {round.artist ? <Check size={14} /> : <Mic2 size={14} />}
            가수명
          </button>
        )}
        {lyricHints && (
          <button
            disabled={locked || wordsLeft <= 0}
            onClick={() => hint("word", mode)}
          >
            <Sparkles size={14} /> 단어 공개
            {wordsLeft !== Infinity && ` ${Math.max(wordsLeft, 0)}`}
          </button>
        )}
      </div>
    </>
  );
}
