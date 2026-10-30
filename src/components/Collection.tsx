import { useCallback, useEffect, useRef, useState } from "react";
import { recentSongIds, unitArts, type UnitEntry } from "../collection";
import { useCollectionSeen } from "../collectionSeen";
import { questions, songs, type Song } from "../game";
import { useGame } from "../store";
import { AlbumArt } from "./AlbumArt";
import { ArrowLeft, Music } from "./icons";
import { Modal } from "./Modal";
import { PlaylistCover } from "./PlaylistCover";
import { ScrollRow } from "./ScrollRow";

const RECENT = 10;

/** 도감 as a streaming app's library, plain on the page so the covers carry the color: how
 *  much is collected, recently guessed songs, then each unit as a playlist (NCT first, then
 *  other artists). Guessed songs show their 앨범아트, and a playlist's cover is made of them;
 *  songs not guessed yet never show theirs, as it would give the title away. A playlist page
 *  lists its tracks; a guessed one opens its lyrics. */
export function Collection({
  units,
  focus = null,
}: {
  units: UnitEntry[];
  /** A playlist to open first (a cover pressed on the dashboard). */
  focus?: string | null;
}) {
  const [open, setOpen] = useState(focus);
  const top = useRef<HTMLDivElement>(null);
  const collected = useGame((s) => s.collected);
  // Songs guessed since the last visit get a NEW mark; opening the 도감 counts as a visit.
  const [seenBefore] = useState(() => useCollectionSeen.getState().seen);
  useEffect(() => {
    useCollectionSeen.getState().markSeen(collected.length);
  }, [collected.length]);
  const newSongs = new Set(
    collected
      .slice(seenBefore)
      .map((id) => questions.find((q) => q.id === id)?.songId),
  );
  const hasNew = (u: UnitEntry) => u.songs.some((s) => newSongs.has(s.song.id));
  const isComplete = (u: UnitEntry) => u.collected === u.songs.length;
  // Opening or leaving a playlist starts at its top.
  useEffect(() => {
    top.current?.scrollIntoView({ block: "start" });
  }, [open]);
  const unit = units.find((u) => u.unit === open);
  const recentSongs = recentSongIds(questions, collected);
  // The guessed song whose lyrics sheet is open; kept while the sheet slides away.
  const [track, setTrack] = useState<Song | null>(null);
  const [closing, setClosing] = useState(false);
  const closed = useCallback(() => {
    setClosing(false);
    setTrack(null);
  }, []);

  if (unit) {
    const arts = unitArts(unit, recentSongs);
    return (
      <div ref={top} className="playlist-detail">
        <button
          type="button"
          className="playlist-back"
          onClick={() => setOpen(null)}
        >
          <ArrowLeft size={18} aria-hidden="true" /> 도감
        </button>
        <header className="playlist-hero">
          <PlaylistCover arts={arts} complete={isComplete(unit)} large />
          <h2>{unit.unit}</h2>
          <p className="playlist-count">
            <b>{unit.collected}</b> / {unit.songs.length}곡
          </p>
          <div className="playlist-actions">
            <Progress label={`${unit.unit} 수집률`} unit={unit} />
          </div>
        </header>
        <ol className="tracklist">
          {unit.songs.map(({ song, total, solved }, i) => (
            <li key={song.id} className={solved ? "solved" : "locked"}>
              {solved ? (
                <button
                  type="button"
                  className="track-row"
                  onClick={() => {
                    setClosing(false);
                    setTrack(song);
                  }}
                >
                  <AlbumArt
                    src={song.art}
                    className="track-art"
                    fallback={
                      <span className="track-art" aria-hidden="true">
                        <Music size={18} />
                      </span>
                    }
                  />
                  <span className="track-title">
                    {song.title}
                    {newSongs.has(song.id) && (
                      <i className="new-dot" aria-label="새 곡" />
                    )}
                  </span>
                  {total > 1 && (
                    <small>
                      {solved}/{total}
                      <span className="sr-only">구간</span>
                    </small>
                  )}
                </button>
              ) : (
                <>
                  <span className="track-art" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="sr-only">
                    {i + 1}번째, 아직 맞히지 않은 곡
                  </span>
                </>
              )}
            </li>
          ))}
        </ol>
        <Modal
          open={track !== null}
          closing={closing}
          onClose={() => setClosing(true)}
          onClosed={closed}
        >
          {track && <TrackSheet song={track} collected={collected} />}
        </Modal>
      </div>
    );
  }

  const recent = recentSongs
    .slice(0, RECENT)
    .map((id) => songs.find((s) => s.id === id))
    .filter((song) => song !== undefined);
  const total = units.reduce((n, u) => n + u.songs.length, 0);
  const found = units.reduce((n, u) => n + u.collected, 0);
  const grid = (list: UnitEntry[]) => (
    <ul className="playlist-grid">
      {list.map((u) => (
        <li key={u.unit}>
          <button
            type="button"
            className="playlist-card"
            onClick={() => setOpen(u.unit)}
          >
            <PlaylistCover
              arts={unitArts(u, recentSongs)}
              complete={isComplete(u)}
            />
            <span className="playlist-meta">
              <strong>
                {u.unit}
                {hasNew(u) && <i className="new-dot" aria-label="새 곡" />}
              </strong>
              <small>
                {u.collected}/{u.songs.length}
              </small>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
  const main = units.filter((u) => u.main);
  const others = units.filter((u) => !u.main);
  return (
    <div ref={top} className="playlist-library">
      <header className="library-head">
        <p className="library-count">
          <b>{found}</b>
          <span> / {total}곡</span>
        </p>
        <span
          className="progress-track"
          role="progressbar"
          aria-label="도감 수집률"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={found}
        >
          <span style={{ width: `${total ? (found / total) * 100 : 0}%` }} />
        </span>
      </header>
      {recent.length > 0 && (
        <>
          <h2 className="record-subtitle">최근 맞힌 곡</h2>
          <ScrollRow className="recent-row">
            {recent.map((song) => (
              <button
                key={song.id}
                type="button"
                className="recent-track"
                onClick={() => setOpen(song.unit)}
              >
                <AlbumArt
                  src={song.art}
                  className="recent-art"
                  fallback={<PlaylistCover />}
                />
                <strong>{song.title}</strong>
                <small>{song.unit}</small>
              </button>
            ))}
          </ScrollRow>
        </>
      )}
      <h2 className="record-subtitle">플레이리스트</h2>
      {grid(main)}
      {others.length > 0 && (
        <>
          <h2 className="record-subtitle">다른 가수</h2>
          {grid(others)}
        </>
      )}
    </div>
  );
}

/** A guessed song: its cover, title and the lyrics of each part guessed (parts not guessed
 *  yet stay hidden). */
function TrackSheet({
  song,
  collected,
}: {
  song: Song;
  collected: readonly string[];
}) {
  const parts = questions.filter(
    (q) => q.songId === song.id && collected.includes(q.id),
  );
  return (
    <div className="track-sheet">
      <AlbumArt
        src={song.art}
        className="track-sheet-art"
        fallback={<PlaylistCover large />}
      />
      <h2>{song.title}</h2>
      <p className="track-sheet-unit">{song.unit}</p>
      {parts.map((q) => (
        <div key={q.id} className="track-lyrics">
          {q.lines.map((line, i) => (
            <p key={i}>{line.map((t) => t.text).join("")}</p>
          ))}
        </div>
      ))}
    </div>
  );
}

function Progress({ label, unit }: { label: string; unit: UnitEntry }) {
  return (
    <span
      className="progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={unit.songs.length}
      aria-valuenow={unit.collected}
    >
      <span
        style={{ width: `${(unit.collected / unit.songs.length) * 100}%` }}
      />
    </span>
  );
}
