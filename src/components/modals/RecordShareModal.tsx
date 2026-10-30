import { useMemo } from "react";
import { buildCollection } from "../../collection";
import { dailySummary } from "../../daily";
import { questions, songs } from "../../game";
import { recordShareText } from "../../share";
import { drawRecordCard } from "../../share-image";
import { ACHIEVEMENTS, useGame } from "../../store";
import { ShareActions } from "../play/ShareActions";

/** 기록 공유: classic records as text and a card image with the dashboard's rings (도감, 업적,
 *  데일리 정답률), opened from the 기록 tab. */
export function RecordShareModal() {
  const stats = useGame((s) => s.stats);
  const history = useGame((s) => s.dailyHistory);
  const today = useGame((s) => s.daily.date);
  const earned = useGame((s) => s.achievements);
  const collected = useGame((s) => s.collected);
  const units = useMemo(
    () => buildCollection(songs, questions, collected),
    [collected],
  );
  const songCount = units.reduce((n, u) => n + u.songs.length, 0);
  const songsFound = units.reduce((n, u) => n + u.collected, 0);
  const daily = dailySummary(history, today);
  const achieved = ACHIEVEMENTS.filter((a) => earned[a.id]).length;
  const text = recordShareText({
    solved: stats.solved,
    best: stats.best,
    dailyStreak: daily.current,
    achieved,
    achievements: ACHIEVEMENTS.length,
  });
  const draw = () =>
    drawRecordCard({
      headline: [
        ["제목 정답", `${stats.solved}`],
        ["데일리 연속", `${daily.current}일`],
        ["업적", `${achieved}/${ACHIEVEMENTS.length}`],
      ],
      details: [
        ["가사 완성", `${stats.completed}문제`],
        ["최고 연속 정답", `${stats.best}문제`],
        ["데일리 퀴즈 참여", `${daily.played}일`],
        ["도감 수집", `${songsFound}/${songCount}곡`],
      ],
      rings: [
        ["도감", Math.round((songsFound / songCount) * 100)],
        ["업적", Math.round((achieved / ACHIEVEMENTS.length) * 100)],
        [
          "데일리 정답률",
          daily.played ? Math.round((daily.solved / daily.played) * 100) : 0,
        ],
      ],
      footer: `${today.replaceAll("-", ".")} 기준`,
    });
  return (
    <>
      <h2>기록 공유</h2>
      <div className="share-results">
        <ShareActions
          text={text}
          link={new URL("/", window.location.href).href}
          draw={draw}
        />
      </div>
    </>
  );
}
