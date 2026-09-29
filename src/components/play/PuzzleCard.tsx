import { songs, type Question } from "../../game";
import type { PlayMode } from "../../modes";
import type { Round } from "../../store";
import { Lyrics } from "./Lyrics";

type Props = {
  question: Question;
  round: Round;
  percent: number;
  playMode?: PlayMode;
};

export function PuzzleCard({
  question,
  round,
  percent,
  playMode = "classic",
}: Props) {
  const simple = playMode === "simple";
  const artist = songs.find((song) => song.id === question.songId)?.artist;
  // 이지 shows the song from the start; other modes keep it hidden until the question ends.
  const known = playMode === "easy" || round.solved || round.givenUp;
  return (
    <section
      className="puzzle-card"
      aria-label={simple ? "가사 문제" : "초성 가사 문제"}
    >
      <p className={`song-reveal${known ? "" : " unknown"}`}>
        <strong>{known ? question.title : "???"}</strong>
        <span>{known || round.artist ? artist : "?"}</span>
      </p>
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
            <b>{round.givenUp ? "—" : `${percent}%`}</b>
          </div>
        </>
      )}
    </section>
  );
}
