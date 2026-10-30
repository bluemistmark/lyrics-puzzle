import type { SongPref } from "../../known";
import { useGame } from "../../store";

const CHOICES: [SongPref, string][] = [
  ["known", "아는 곡"],
  ["unknown", "모르는 곡"],
];

/** 아는 곡·모르는 곡 buttons on a finished question; pressing the chosen one again clears it. */
export function SongPrefVote({ songId }: { songId: string }) {
  const mine = useGame((s) => s.songPrefs[songId]?.pref ?? null);
  const markSong = useGame((s) => s.markSong);
  return (
    <div className="difficulty-vote song-pref">
      <span id={`song-pref-${songId}`}>이 곡, 알고 있었나요?</span>
      <div role="group" aria-labelledby={`song-pref-${songId}`}>
        {CHOICES.map(([pref, label]) => (
          <button
            key={pref}
            type="button"
            aria-pressed={mine === pref}
            onClick={() => markSong(songId, mine === pref ? null : pref)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
