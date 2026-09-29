import { useEffect } from "react";
import { ACHIEVEMENTS, useGame } from "../store";
import { AchievementIcon } from "./AchievementIcon";

const SHOWN_MS = 3500;

/** Shows newly reached achievements for a moment; several at once share one toast. */
export function AchievementToast() {
  const ids = useGame((s) => s.justUnlocked);
  const dismiss = useGame((s) => s.dismissUnlocked);
  const key = ids.join();
  useEffect(() => {
    if (!key) return;
    const timer = window.setTimeout(dismiss, SHOWN_MS);
    return () => window.clearTimeout(timer);
  }, [key, dismiss]);
  const reached = ACHIEVEMENTS.filter((a) => ids.includes(a.id));
  const [first] = reached;
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
          className="achievement-toast"
          onClick={dismiss}
          aria-label={`업적 달성: ${reached.map((a) => a.title).join(", ")}. 눌러서 닫기`}
        >
          <AchievementIcon name={first.icon} size={20} />
          <span>
            <small>업적 달성</small>
            <strong>{title}</strong>
          </span>
        </button>
      )}
    </div>
  );
}
