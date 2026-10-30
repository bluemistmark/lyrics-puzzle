import type { ReactNode } from "react";
import { unitArts, unitsByRecent, type UnitEntry } from "../collection";
import type { DailyHistory, DailySummary } from "../daily";
import { ACHIEVEMENTS, type Stats } from "../store";
import { useCountUp } from "../hooks/useCountUp";
import { Flame } from "./icons";
import { PlaylistCover } from "./PlaylistCover";
import { ScrollRow } from "./ScrollRow";

type Props = {
  stats: Stats;
  daily: DailySummary;
  history: DailyHistory;
  today: string;
  units: UnitEntry[];
  /** Guessed songs, most recent first (for the units' covers). */
  recent: string[];
  earned: Record<string, string>;
  onCollection: () => void;
  /** A cover in the 도감 row: opens that unit's playlist in the 도감 tab. */
  onUnit: (unit: string) => void;
  onAchievements: () => void;
  onDaily: () => void;
};

/** 기록 요약: widget cards (데일리, 업적, 도감, 정답, 최고 연속), mostly charts and big numbers,
 *  each with an arrow to its tab where there is more to see. */
export function RecordDashboard({
  stats,
  daily,
  history,
  today,
  units,
  recent,
  earned,
  onCollection,
  onUnit,
  onAchievements,
  onDaily,
}: Props) {
  const songCount = units.reduce((n, u) => n + u.songs.length, 0);
  const songsFound = units.reduce((n, u) => n + u.collected, 0);
  const achieved = ACHIEVEMENTS.filter((a) => earned[a.id]);
  const todayResult = history[today];

  return (
    <div className="bento">
      <Widget title="데일리" onMore={onDaily}>
        <div className="widget-center">
          <p className="streak-line" aria-label={`${daily.current}일 연속`}>
            <Flame size={24} weight="fill" aria-hidden="true" />
            <CountUp value={daily.current} />
            <small>일</small>
          </p>
          <span className={`status-chip${todayResult?.solved ? " done" : ""}`}>
            {todayResult?.solved
              ? "오늘 정답"
              : todayResult
                ? "오늘 포기"
                : "도전 전"}
          </span>
        </div>
      </Widget>

      <Widget
        title="업적"
        aside={`${achieved.length} / ${ACHIEVEMENTS.length}`}
        onMore={onAchievements}
      >
        <div className="widget-center">
          <Ring
            value={Math.round((achieved.length / ACHIEVEMENTS.length) * 100)}
            label="달성"
          />
        </div>
      </Widget>

      <Widget
        size="wide"
        title="도감"
        aside={`${songsFound} / ${songCount}`}
        onMore={onCollection}
      >
        <ScrollRow className="unit-cards">
          {unitsByRecent(units, recent).map((u) => (
            <button
              key={u.unit}
              type="button"
              className="unit-card"
              onClick={() => onUnit(u.unit)}
            >
              <PlaylistCover
                arts={unitArts(u, recent)}
                complete={u.collected === u.songs.length}
              />
              <span className="unit-card-meta">
                <span>{u.unit}</span>
                <strong>
                  {Math.round((u.collected / u.songs.length) * 100)}
                  <small>%</small>
                </strong>
              </span>
            </button>
          ))}
        </ScrollRow>
      </Widget>

      <Widget title="정답">
        <p className="big-number">
          <CountUp value={stats.solved} />
          <small>문제</small>
        </p>
      </Widget>

      <Widget title="최고 연속">
        <p className="big-number">
          <CountUp value={stats.best} />
          <small>문제</small>
        </p>
      </Widget>
    </div>
  );
}

/** A dashboard block: a title row (with a short note) and content. With onMore the whole
 *  card is the way to its tab. */
function Widget({
  title,
  aside,
  onMore,
  size = "half",
  children,
}: {
  title: string;
  aside?: string;
  onMore?: () => void;
  /** wide spans both columns of the dashboard; half takes one. */
  size?: "wide" | "half";
  children: ReactNode;
}) {
  return (
    <section
      className={`record-item widget ${size}${onMore ? " linked" : ""}`}
      aria-label={title}
    >
      <div className="widget-head">
        {/* With onMore the title is a button stretched over the whole card (CSS). */}
        <h2>
          {onMore ? (
            <button type="button" className="widget-link" onClick={onMore}>
              {title}
            </button>
          ) : (
            title
          )}
        </h2>
        {aside && <span>{aside}</span>}
      </div>
      {children}
    </section>
  );
}

/** A percentage as a ring, the number in its middle. */
function Ring({ value: target, label }: { value: number; label: string }) {
  const value = useCountUp(target);
  const r = 30;
  const length = 2 * Math.PI * r;
  return (
    <div className="ring" role="img" aria-label={`${label} ${target}%`}>
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <circle className="ring-track" cx="36" cy="36" r={r} />
        <circle
          className="ring-value"
          cx="36"
          cy="36"
          r={r}
          strokeDasharray={length}
          strokeDashoffset={length * (1 - value / 100)}
        />
      </svg>
      <span aria-hidden="true">
        <span>
          <b>{value}</b>%
        </span>
        <small>{label}</small>
      </span>
    </div>
  );
}

/** A number counting up from 0 when the dashboard opens. */
function CountUp({ value }: { value: number }) {
  return <b>{useCountUp(value)}</b>;
}
