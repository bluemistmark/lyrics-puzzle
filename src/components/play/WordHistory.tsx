import { Check, X } from "lucide-react";
import type { Round } from "../../store";

export function WordHistory({ words }: { words: Round["words"] }) {
  return (
    <div className="word-history">
      {words.length ? (
        words
          .slice(-8)
          .reverse()
          .map((w, i) => (
            <span className={w.hit ? "hit" : "miss"} key={i}>
              {w.word}
              {w.hit ? <Check size={13} /> : <X size={12} />}
            </span>
          ))
      ) : (
        <span className="empty-history">입력 기록 없음</span>
      )}
    </div>
  );
}
