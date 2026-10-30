import { useMemo, useState } from "react";
import { RotateCcw } from "./icons";
import { buildCollection, recentSongIds } from "../collection";
import { dailySummary } from "../daily";
import { questions, songs } from "../game";
import { useGame } from "../store";
import { useAccount } from "../account";
import { Achievements } from "./Achievements";
import { Collection } from "./Collection";
import { RecordDashboard } from "./RecordDashboard";
import { Segmented } from "./Segmented";

type View = "stats" | "collection" | "achievements";
const VIEWS = [
  ["stats", "요약"],
  ["collection", "도감"],
  ["achievements", "업적"],
] as const;
type Props = {
  hidden: boolean;
  onReset: () => void;
  /** 첫 문제 풀기 on an empty record: goes to the play tab. */
  onPlay: () => void;
  /** The 데일리 widget's 더보기: goes to the daily tab. */
  onDaily: () => void;
  /** A 도감 playlist's play button: a question from that unit in the play tab. */
  onPlayUnit: (unit: string) => void;
};

export function RecordPanel({
  hidden,
  onReset,
  onPlay,
  onDaily,
  onPlayUnit,
}: Props) {
  const [view, setView] = useState<View>("stats");
  // The unit a 도감 cover was pressed for: its playlist opens in the 도감 tab.
  const [focusUnit, setFocusUnit] = useState<string | null>(null);
  const stats = useGame((s) => s.stats);
  const history = useGame((s) => s.dailyHistory);
  const today = useGame((s) => s.daily.date);
  const playLog = useGame((s) => s.playLog);
  const modeStats = useGame((s) => s.modeStats);
  const earned = useGame((s) => s.achievements);
  const signedIn = useAccount((s) => s.status === "signedIn");
  const daily = dailySummary(history, today);
  const collected = useGame((s) => s.collected);
  const units = useMemo(
    () => buildCollection(songs, questions, collected),
    [collected],
  );
  // Nothing played in any mode yet: one way in instead of a page of zeros.
  const empty =
    !Object.keys(playLog).length &&
    !Object.keys(history).length &&
    !Object.values(modeStats).some((m) => m.solved || m.givenUp);
  return (
    <section
      id="record-panel"
      role="tabpanel"
      aria-labelledby="record-tab"
      hidden={hidden}
      className="record-panel"
    >
      <h1>나의 기록</h1>

      {empty ? (
        <EmptyState onPlay={onPlay} />
      ) : (
        <>
          {/* 요약·도감·업적 (기록 공유 is in the top bar). */}
          <div className="record-views">
            <Segmented
              label="기록 보기"
              items={VIEWS}
              value={view}
              onChange={setView}
            />
          </div>

          {view === "achievements" ? (
            <Achievements today={today} />
          ) : view === "collection" ? (
            <Collection
              units={units}
              focus={focusUnit}
              onPlayUnit={onPlayUnit}
            />
          ) : (
            <>
              {!hidden && (
                <RecordDashboard
                  stats={stats}
                  daily={daily}
                  history={history}
                  today={today}
                  units={units}
                  recent={recentSongIds(questions, collected)}
                  earned={earned}
                  onCollection={() => {
                    setFocusUnit(null);
                    setView("collection");
                  }}
                  onUnit={(unit) => {
                    setFocusUnit(unit);
                    setView("collection");
                  }}
                  onAchievements={() => setView("achievements")}
                  onDaily={onDaily}
                />
              )}

              {!signedIn && (
                <p className="record-note">
                  기록은 이 브라우저에만 저장돼요. 로그인하면 계정에 저장돼요.
                </p>
              )}
              <button className="reset-btn" onClick={onReset}>
                <RotateCcw size={14} /> 기록 초기화
              </button>
            </>
          )}
        </>
      )}
    </section>
  );
}

/** An empty 기록: a line and the way to start filling it. */
export function EmptyState({ onPlay }: { onPlay: () => void }) {
  return (
    <div className="record-item empty-state">
      {/* The logo's bars rising from an empty shelf. */}
      <svg className="empty-art" viewBox="0 0 120 96" aria-hidden="true">
        <rect
          className="empty-art-shelf"
          x="14"
          y="80"
          width="92"
          height="6"
          rx="3"
        />
        <rect x="28" y="52" width="10" height="24" rx="5" />
        <rect x="44" y="34" width="10" height="42" rx="5" />
        <rect x="60" y="46" width="10" height="30" rx="5" />
        <rect x="76" y="22" width="10" height="54" rx="5" />
        <circle className="empty-art-spark" cx="98" cy="18" r="4" />
        <circle className="empty-art-spark" cx="20" cy="36" r="3" />
      </svg>
      <strong>아직 기록이 없어요</strong>
      <button type="button" className="primary" onClick={onPlay}>
        첫 문제 풀기
      </button>
    </div>
  );
}
