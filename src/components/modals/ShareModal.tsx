import { dailySummary } from "../../daily";
import { useRound } from "../../hooks/useRound";
import { useGame, type GameMode } from "../../store";
import { PlayShare } from "../play/PlayShare";
import { ShareResults } from "../play/ShareResults";

/** Result sharing for a finished play or daily question, opened from its top share button. */
export function ShareModal({ mode = "play" }: { mode?: GameMode }) {
  const { round, question, percent } = useRound(mode);
  const playMode = useGame((s) => s.playMode);
  const date = useGame((s) => s.daily.date);
  const history = useGame((s) => s.dailyHistory);
  return (
    <>
      <h2>결과 공유</h2>
      <div className="share-results">
        {mode === "daily" ? (
          <ShareResults
            date={date}
            question={question}
            round={round}
            percent={percent}
            streak={dailySummary(history, date).current}
          />
        ) : (
          <PlayShare
            question={question}
            round={round}
            percent={percent}
            playMode={playMode}
          />
        )}
      </div>
    </>
  );
}
