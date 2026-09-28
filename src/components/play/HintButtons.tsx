import { Check, Mic2, Sparkles } from "lucide-react";
import { songs, type Question } from "../../game";
import { useGame, type GameMode, type Round } from "../../store";

type Props = {
  question: Question;
  round: Round;
  full: boolean;
  mode?: GameMode;
};

export function HintButtons({ question, round, full, mode = "play" }: Props) {
  const hint = useGame((s) => s.hint);
  const locked = round.givenUp || full;
  const hasEnglish = question.lines.some((line) =>
    line.some((t) => t.pronunciation),
  );
  const artist = songs.find((song) => song.id === question.songId)?.artist;
  return (
    <>
      <div className="hints">
        <div>
          <button
            disabled={round.english || locked || !hasEnglish}
            onClick={() => hint("english", mode)}
          >
            {round.english ? (
              <Check size={14} />
            ) : (
              <span className="english-a">A</span>
            )}{" "}
            영어 표시
          </button>
          <button
            disabled={round.artist || locked}
            onClick={() => hint("artist", mode)}
          >
            {round.artist ? <Check size={14} /> : <Mic2 size={14} />}
            가수명
          </button>
          <button disabled={locked} onClick={() => hint("word", mode)}>
            <Sparkles size={14} /> 단어 공개
          </button>
        </div>
      </div>
      {round.artist && artist && (
        <p className="artist-hint">
          가수 <strong>{artist}</strong>
        </p>
      )}
    </>
  );
}
