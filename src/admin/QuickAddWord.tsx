import { useState } from "react";
import { useAdmin } from "./store";

/** Inline "register this English word" row used inside question forms. */
export function QuickAddWord({ word }: { word: string }) {
  const saveEntry = useAdmin((s) => s.saveEntry);
  const [pronunciation, setPronunciation] = useState("");
  const [error, setError] = useState("");
  const add = async () => {
    if (!pronunciation.trim()) return setError("표시발음을 입력하세요.");
    try {
      await saveEntry(
        {
          english: word,
          pronunciation: pronunciation.trim(),
          alternatives: [],
        },
        true,
      );
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <div className="quick-add">
      <span className="mono">{word}</span>
      <input
        placeholder="표시발음 (예: 예)"
        value={pronunciation}
        onChange={(e) => setPronunciation(e.target.value)}
        onKeyDown={(e) => {
          // Enter would submit the surrounding question form.
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            add();
          }
        }}
      />
      <button type="button" onClick={add}>
        사전에 추가
      </button>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
