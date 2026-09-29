import { ACHIEVEMENT_GROUPS } from "../achievements";
import { useDifficulty } from "../difficulty";
import { useRanking } from "../ranking";
import { ACHIEVEMENTS, useGame } from "../store";
import { AchievementIcon } from "./AchievementIcon";

/** 업적 in the record tab, by group: reached ones show their date, the rest their progress. */
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
  return (
    <>
      <h2 className="record-subtitle">
        업적{" "}
        <span className="achievement-count">
          {count} / {ACHIEVEMENTS.length}
        </span>
      </h2>
      {ACHIEVEMENT_GROUPS.map((group) => (
        <section key={group} className="achievement-group">
          <h3>{group}</h3>
          <ul className="achievement-grid">
            {ACHIEVEMENTS.filter((a) => a.group === group).map((a) => {
              const date = earned[a.id];
              if (a.hidden && !date)
                return (
                  <li key={a.id} className="record-item achievement secret">
                    <AchievementIcon name="lock" size={20} />
                    <strong>???</strong>
                    <span>조건을 찾아보세요.</span>
                  </li>
                );
              const { current, goal } = a.progress(input);
              return (
                <li
                  key={a.id}
                  className={`record-item achievement${date ? " earned" : ""}`}
                >
                  <AchievementIcon name={a.icon} size={20} />
                  <strong>{a.title}</strong>
                  <span>{a.description}</span>
                  {date ? (
                    <small>{date.replaceAll("-", ".")} 달성</small>
                  ) : (
                    <>
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
                      <small>
                        {current} / {goal}
                      </small>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
