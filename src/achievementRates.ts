import { create } from "zustand";
import { requestJson, useRanking } from "./ranking.ts";
import { useGame } from "./store.ts";

// 업적 달성률 (게임 쪽). 서버는 api/achievements.ts, DB는 supabase/migrations/*_achievement_unlocks.sql.
// Reached achievement ids go to the server under the ranking's anonymous token; the 업적
// sheet shows what share of players reached each one. The game works without any of this:
// a failed request only leaves the number out.

export type AchievementRates = {
  /** Players who reached at least one achievement. */
  total: number;
  counts: Record<string, number>;
};

/** Below this many players a share says little: it is left out. */
export const MIN_PLAYERS = 10;

/** "플레이어의 12%가 달성" (or "1% 미만이", or none yet), or null when there are too few players
 *  to tell. */
export function rateLabel(rates: AchievementRates | null, id: string) {
  if (!rates || rates.total < MIN_PLAYERS) return null;
  const count = rates.counts[id] ?? 0;
  const share = (count / rates.total) * 100;
  if (!count) return "아직 달성한 플레이어가 없어요";
  return share < 1
    ? "플레이어의 1% 미만이 달성"
    : `플레이어의 ${Math.round(share)}%가 달성`;
}

/** Reached by fewer than this share (%) of players: shown as rare. */
export const RARE_SHARE = 5;

/** Reached by someone, but by fewer than RARE_SHARE % of players (once there are enough). */
export function isRare(rates: AchievementRates | null, id: string) {
  if (!rates || rates.total < MIN_PLAYERS) return false;
  const count = rates.counts[id] ?? 0;
  return count > 0 && (count / rates.total) * 100 < RARE_SHARE;
}

const ENDPOINT = "/api/achievements";
/** Fetched again after this long (the server caches about as long). */
const STALE_MS = 5 * 60 * 1000;

type RatesStore = {
  rates: AchievementRates | null;
  loadedAt: number;
  /** Fetches the rates unless they are fresh; failures keep what there was. */
  load: () => Promise<void>;
};
export const useAchievementRates = create<RatesStore>()((set, get) => ({
  rates: null,
  loadedAt: 0,
  load: async () => {
    if (Date.now() - get().loadedAt < STALE_MS) return;
    set({ loadedAt: Date.now() });
    try {
      set({ rates: await requestJson<AchievementRates>(ENDPOINT) });
    } catch {
      set({ loadedAt: 0 });
    }
  },
}));

// What already reached the server, per token, so a visit sends nothing new.
const SENT_KEY = "lyrics-achievements-sent";
type Sent = { token: string; ids: string[] };
function readSent(): Sent {
  try {
    const value = JSON.parse(localStorage.getItem(SENT_KEY) ?? "null") as Sent;
    return value && Array.isArray(value.ids) ? value : { token: "", ids: [] };
  } catch {
    return { token: "", ids: [] };
  }
}
function writeSent(sent: Sent) {
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify(sent));
  } catch {
    /* Storage may be unavailable: the ids are sent again next time (harmless). */
  }
}

let sending = false;
/** Sends the reached achievements the server doesn't have yet (all of them after a new token). */
async function sendUnlocks() {
  const ids = Object.keys(useGame.getState().achievements);
  if (!ids.length || sending) return;
  const token = useRanking.getState().ensureToken();
  const sent = readSent();
  const known = new Set(sent.token === token ? sent.ids : []);
  const fresh = ids.filter((id) => !known.has(id));
  if (!fresh.length) return;
  sending = true;
  try {
    await requestJson(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, ids: fresh }),
    });
    writeSent({ token, ids: [...known, ...fresh] });
  } catch {
    // Tried again on the next change or visit.
  } finally {
    sending = false;
  }
}

/** Called once from main.tsx: sends what is unsent now and after each new achievement. */
export function startAchievementSync() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const later = (ms: number) => {
    clearTimeout(timer);
    timer = setTimeout(() => void sendUnlocks(), ms);
  };
  // Not during the first paint; a few seconds after a new achievement, so a burst goes at once.
  later(5000);
  useGame.subscribe((s, prev) => {
    if (s.achievements !== prev.achievements) later(3000);
  });
  // A token from the account (login) may differ from the one used before.
  useRanking.subscribe((s, prev) => {
    if (s.token !== prev.token) later(3000);
  });
}
