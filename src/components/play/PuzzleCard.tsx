import { songs, type Question } from "../../game";
import type { PlayMode } from "../../modes";
import type { Round } from "../../store";
import { Lyrics } from "./Lyrics";

type Props = {
  question: Question;
  round: Round;
  percent: number;
  full: boolean;
  playMode?: PlayMode;
};

export function PuzzleCard({
  question,
  round,
  percent,
  full,
  playMode = "classic",
}: Props) {
  const simple = playMode === "simple";
  const artist = songs.find((song) => song.id === question.songId)?.artist;
  return (
    <section
      className="puzzle-card"
      aria-label={simple ? "가사 문제" : "초성 가사 문제"}
    >
      {playMode === "easy" && (
        <p className="song-reveal">
          <strong>{question.title}</strong>
          {artist && <span>{artist}</span>}
        </p>
      )}
      <Lyrics
        question={question}
        revealed={round.revealed}
        showAll={round.givenUp || simple}
        markEnglish={round.english}
      />
      {!simple && (
        <>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="가사 복원율"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div style={{ width: `${percent}%` }} />
          </div>
          <div className="progress-label">
            <span>
              {round.givenUp ? "정답 공개" : full ? "가사 완성" : "가사 복원"}
            </span>
            <b>{round.givenUp ? "—" : `${percent}%`}</b>
          </div>
        </>
      )}
    </section>
  );
}
