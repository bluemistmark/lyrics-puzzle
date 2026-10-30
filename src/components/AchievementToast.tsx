import { useEffect } from "react";
import { isRare, useAchievementRates } from "../achievementRates";
import { ACHIEVEMENTS, useGame } from "../store";
import { AchievementIcon } from "./AchievementIcon";

const SHOWN_MS = 3500;

/** Shows newly reached achievements for a moment; several at once share one toast. One few
 *  players have reached is called rare (when the rates arrive in time). */
export function AchievementToast() {
  const ids = useGame((s) => s.justUnlocked);
  const dismiss = useGame((s) => s.dismissUnlocked);
  const rates = useAchievementRates((s) => s.rates);
  const loadRates = useAchievementRates((s) => s.load);
  const key = ids.join();
  useEffect(() => {
    if (!key) return;
    void loadRates();
    const timer = window.setTimeout(dismiss, SHOWN_MS);
    return () => window.clearTimeout(timer);
  }, [key, dismiss, loadRates]);
  const reached = ACHIEVEMENTS.filter((a) => ids.includes(a.id));
  // The rare one leads when there are several.
  reached.sort(
    (a, b) => Number(isRare(rates, b.id)) - Number(isRare(rates, a.id)),
  );
  const [first] = reached;
  const rare = first !== undefined && isRare(rates, first.id);
  const title =
    reached.length > 1
      ? `${first.title} 외 ${reached.length - 1}개`
      : first?.title;
  return (
    <div className="achievement-toast-region" role="status" aria-live="polite">
      {first && (
        <button
          key={key}
          type="button"
          className={`achievement-toast${rare ? " rare" : ""}`}
          onClick={dismiss}
          aria-label={`${rare ? "희귀 " : ""}업적 달성: ${reached.map((a) => a.title).join(", ")}. 눌러서 닫기`}
        >
          <AchievementIcon name={first.icon} size={20} />
          <span>
            <small>{rare ? "희귀 업적 달성" : "업적 달성"}</small>
            <strong>{title}</strong>
          </span>
        </button>
      )}
    </div>
  );
}
