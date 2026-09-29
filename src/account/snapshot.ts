import { useDifficulty } from "../difficulty.ts";
import { useRanking } from "../ranking.ts";
import { useGame } from "../store.ts";
import type { SaveData } from "./save.ts";

/** What this device would save to the account right now. */
export function snapshot(): SaveData {
  const g = useGame.getState();
  const r = useRanking.getState();
  return {
    version: 1,
    resetAt: g.resetAt,
    stats: g.stats,
    collected: g.collected,
    dailyHistory: g.dailyHistory,
    playLog: g.playLog,
    feats: g.feats,
    achievements: g.achievements,
    themes: g.themes,
    votes: useDifficulty.getState().votes,
    ranking: {
      token: r.token,
      nickname: r.nickname,
      submitted: r.submitted,
      asked: r.asked,
    },
  };
}

/** Puts a merged save into the stores (quietly: no achievement toasts). */
export function applySnapshot(data: SaveData) {
  const { votes, ranking, version: _version, ...records } = data;
  // The other stores' subscriptions re-judge achievements; keep whatever toast was already due.
  const toasts = useGame.getState().justUnlocked;
  useDifficulty.setState({ votes });
  useRanking.setState(ranking);
  useGame.getState().loadRecords(records);
  useGame.setState({ justUnlocked: toasts });
}
