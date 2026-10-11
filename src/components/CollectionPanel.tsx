import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { buildCollection, type UnitEntry } from "../collection";
import { questions, songs } from "../game";
import { useGame } from "../store";

const unitCard = (u: UnitEntry) => (
  <details className="record-item collection-unit" key={u.unit}>
    <summary className="collection-head">
      <strong>{u.unit}</strong>
      <span>
        {u.collected} / {u.songs.length}
        <ChevronDown size={16} aria-hidden="true" />
      </span>
    </summary>
    <div
      className="progress-track"
      role="progressbar"
      aria-label={`${u.unit} 수집률`}
      aria-valuemin={0}
      aria-valuemax={u.songs.length}
      aria-valuenow={u.collected}
    >
      <div style={{ width: `${(u.collected / u.songs.length) * 100}%` }} />
    </div>
    <ul className="collection-songs">
      {u.songs.map(({ song, total, solved }) =>
        solved ? (
          <li key={song.id}>
            {song.title}
            {total > 1 && (
              <small>
                {solved}/{total}
                <span className="sr-only">구간</span>
              </small>
            )}
          </li>
        ) : (
          <li key={song.id} className="locked">
            <span aria-hidden="true">???</span>
            <span className="sr-only">아직 맞히지 않은 곡</span>
          </li>
        ),
      )}
    </ul>
  </details>
);

export function CollectionPanel({ hidden }: { hidden: boolean }) {
  const collected = useGame((s) => s.collected);
  const units = useMemo(
    () => buildCollection(songs, questions, collected),
    [collected],
  );
  const total = units.reduce((n, u) => n + u.songs.length, 0);
  const count = units.reduce((n, u) => n + u.collected, 0);
  const main = units.filter((u) => u.main);
  const others = units.filter((u) => !u.main);
  return (
    <section
      id="collection-panel"
      role="tabpanel"
      aria-labelledby="collection-tab"
      hidden={hidden}
      className="record-panel collection-panel"
    >
      <h1>곡 도감</h1>
      <p className="collection-summary">
        <b>{count}</b> / {total}곡 수집
      </p>
      <div className="record-grid">{main.map(unitCard)}</div>
      {others.length > 0 && (
        <>
          <h2 className="record-subtitle">다른 가수</h2>
          <div className="record-grid">{others.map(unitCard)}</div>
        </>
      )}
      <p className="record-note">
        제목을 맞히면 곡이 도감에 등록돼요. 데일리 퀴즈도 포함되며, 유닛을
        누르면 곡 목록을 볼 수 있어요.
      </p>
    </section>
  );
}
