import { songs, type Question } from "../../game";
import { AlbumArt } from "../AlbumArt";
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
  const song = songs.find((s) => s.id === question.songId);
  const artist = song?.artist;
  // 이지 shows the song from the start; other modes keep it hidden until the question ends.
  const known = playMode === "easy" || round.solved || round.givenUp;
  return (
    <section
      className="puzzle-card"
      aria-label={simple ? "가사 문제" : "초성 가사 문제"}
    >
      {/* data-empty: nothing known yet (title nor 가수명 hint), so themes may hide the row. */}
      <p
        className={`song-reveal${known ? "" : " unknown"}`}
        data-empty={!known && !round.artist}
      >
        {/* Only once the title shows: the cover would give it away. */}
        {known && <AlbumArt src={song?.art} className="reveal-art" />}
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
