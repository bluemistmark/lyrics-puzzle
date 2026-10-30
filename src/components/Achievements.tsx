import { useCallback, useEffect, useState } from "react";
import { isRare, rateLabel, useAchievementRates } from "../achievementRates";
import { ACHIEVEMENT_GROUPS, type Achievement } from "../achievements";
import { useDifficulty } from "../difficulty";
import { useRanking } from "../ranking";
import { ACHIEVEMENTS, useGame } from "../store";
import { AchievementIcon } from "./AchievementIcon";
import { Modal } from "./Modal";

/** 업적 in the record tab, by group: each an icon and a name; pressing one opens a sheet with
 *  how to reach it and how far along it is (or when it was reached). */
export function Achievements({ today }: { today: string }) {
  const stats = useGame((s) => s.stats);
  const collected = useGame((s) => s.collected);
  const dailyHistory = useGame((s) => s.dailyHistory);
  const playLog = useGame((s) => s.playLog);
  const feats = useGame((s) => s.feats);
  const themes = useGame((s) => s.themes);
  const earned = useGame((s) => s.achievements);
  const votes = useDifficulty((s) => Object.keys(s.votes).length);
  const hasNickname = useRanking((s) => Boolean(s.nickname));
  const rates = useAchievementRates((s) => s.rates);
  const loadRates = useAchievementRates((s) => s.load);
  useEffect(() => {
    void loadRates();
  }, [loadRates]);
  const input = {
    stats,
    collected,
    dailyHistory,
    playLog,
    feats,
    themes,
    votes,
    hasNickname,
    today,
  };
  const count = ACHIEVEMENTS.filter((a) => earned[a.id]).length;
  // The open sheet's achievement; kept while the sheet slides away.
  const [open, setOpen] = useState<Achievement | null>(null);
  const [closing, setClosing] = useState(false);
  const closed = useCallback(() => {
    setClosing(false);
    setOpen(null);
  }, []);
  return (
    <>
      <h2 className="record-subtitle">
        업적{" "}
        <span className="achievement-count">
          {count} / {ACHIEVEMENTS.length}
        </span>
      </h2>
      {ACHIEVEMENT_GROUPS.map((group) => {
        // Reached ones first (in their order), then the rest.
        const list = ACHIEVEMENTS.filter((a) => a.group === group).sort(
          (a, b) => Number(!earned[a.id]) - Number(!earned[b.id]),
        );
        const reached = list.filter((a) => earned[a.id]).length;
        return (
          <section key={group} className="achievement-group">
            <h3>
              {group}{" "}
              <span className="achievement-group-count">
                {reached}/{list.length}
              </span>
            </h3>
            <ul className="achievement-grid">
              {list.map((a) => {
                const secret = a.hidden && !earned[a.id];
                // A hidden one not reached yet doesn't tell even that.
                const rare = !secret && isRare(rates, a.id);
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      className={`record-item achievement${earned[a.id] ? " earned" : ""}${secret ? " secret" : ""}${rare ? " rare" : ""}`}
                      onClick={() => {
                        setClosing(false);
                        setOpen(a);
                      }}
                    >
                      <span className="medal">
                        <AchievementIcon
                          name={secret ? "lock" : a.icon}
                          size={18}
                        />
                      </span>
                      <strong>{secret ? "???" : a.title}</strong>
                      {rare && <span className="sr-only">희귀 업적</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <Modal
        open={open !== null}
        closing={closing}
        onClose={() => setClosing(true)}
        onClosed={closed}
      >
        {open && (
          <AchievementSheet
            achievement={open}
            date={earned[open.id]}
            progress={open.progress(input)}
            rate={rateLabel(rates, open.id)}
            rare={!(open.hidden && !earned[open.id]) && isRare(rates, open.id)}
          />
        )}
      </Modal>
    </>
  );
}

/** One achievement: how to reach it, then when it was reached or how far along it is, and
 *  how many players reached it. */
function AchievementSheet({
  achievement: a,
  date,
  progress: { current, goal },
  rate,
  rare,
}: {
  achievement: Achievement;
  date: string | undefined;
  progress: { current: number; goal: number };
  /** Share of players who reached it, when known. */
  rate: string | null;
  rare: boolean;
}) {
  const secret = a.hidden && !date;
  return (
    <div
      className={`achievement-sheet${date ? " earned" : ""}${rare ? " rare" : ""}`}
    >
      <span className="medal large">
        <AchievementIcon name={secret ? "lock" : a.icon} size={32} />
      </span>
      <h2>{secret ? "숨은 업적" : a.title}</h2>
      <p>{secret ? "조건을 찾아보세요." : a.description}</p>
      {date ? (
        <span className="status-chip done">
          {date.replaceAll("-", ".")} 달성
        </span>
      ) : (
        !secret && (
          <div className="achievement-progress">
            <div
              className="progress-track"
              role="progressbar"
              aria-label={`${a.title} 진행도`}
              aria-valuemin={0}
              aria-valuemax={goal}
              aria-valuenow={current}
            >
              <div style={{ width: `${(current / goal) * 100}%` }} />
            </div>
            <b>
              {current} / {goal}
            </b>
          </div>
        )
      )}
      {rate && <p className="achievement-rate">{rate}</p>}
    </div>
  );
}
