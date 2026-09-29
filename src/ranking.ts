import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nicknameError, normalizeNickname } from "./nickname.ts";

// 오늘의 문제 일간 랭킹 (게임 쪽). 서버는 api/ranking.ts, DB는 supabase/migrations/*_ranking.sql.
// The game still works without this: every call here may fail and callers show a message.

export type RankingEntry = {
  rank: number;
  nickname: string;
  hints: number;
  guesses: number;
  me: boolean;
};
export type RankingBoard = {
  participants: number;
  solved: number;
  entries: RankingEntry[];
  /** My place, or null when I haven't solved today, have no nickname or am hidden. */
  me: { rank: number; hints: number; guesses: number } | null;
};
export type DailySubmission = {
  date: string;
  solved: boolean;
  guesses: number;
  hints: number;
};

const ENDPOINT = "/api/ranking";

/** Fetches JSON from our /api; failures become Korean errors (the server's message when it sent one). */
export async function requestJson<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw Error("서버에 연결할 수 없어요.");
  }
  const body = (await response.json().catch(() => null)) as
    (T & { error?: string }) | null;
  if (!response.ok || !body)
    throw Error(body?.error ?? "요청을 처리하지 못했어요.");
  return body;
}
const call = <T>(init: RequestInit & { query?: string }) =>
  requestJson<T>(`${ENDPOINT}${init.query ?? ""}`, init);

/** 32 random bytes as base64url. The server only stores its SHA-256. */
function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

type RankingStore = {
  /** Empty until the first submission or nickname save. */
  token: string;
  nickname: string;
  /** Date whose daily result reached the server. */
  submitted: string;
  /** The first-solve nickname prompt was shown (saved or skipped). */
  asked: boolean;
  /** Bumped when the board should be fetched again (not persisted). */
  version: number;
  submit: (result: DailySubmission) => Promise<void>;
  saveNickname: (name: string) => Promise<void>;
  skipNickname: () => void;
  load: (date: string) => Promise<RankingBoard>;
  /** Anonymous player token, created on first use; also used by 체감 난이도. */
  ensureToken: () => string;
};

export const useRanking = create<RankingStore>()(
  persist(
    (set, get) => {
      const ensureToken = () => {
        if (!get().token) set({ token: newToken() });
        return get().token;
      };
      const json = (method: string, body: object): RequestInit => ({
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: ensureToken(), ...body }),
      });
      return {
        token: "",
        nickname: "",
        submitted: "",
        asked: false,
        version: 0,
        submit: async (result) => {
          if (get().submitted === result.date) return;
          await call(json("POST", result));
          // No version bump: the caller loads the board right after submitting.
          set({ submitted: result.date });
        },
        saveNickname: async (name) => {
          const nickname = normalizeNickname(name);
          const error = nicknameError(nickname);
          if (error) throw Error(error);
          await call(json("PUT", { nickname }));
          set((s) => ({ nickname, asked: true, version: s.version + 1 }));
        },
        skipNickname: () => set({ asked: true }),
        ensureToken,
        load: (date) =>
          call<RankingBoard>({
            query: `?date=${date}`,
            headers: get().token ? { "x-ranking-token": get().token } : {},
          }),
      };
    },
    {
      name: "lyrics-ranking-v1",
      partialize: ({ token, nickname, submitted, asked }) => ({
        token,
        nickname,
        submitted,
        asked,
      }),
    },
  ),
);
