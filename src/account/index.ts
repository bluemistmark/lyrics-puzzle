import { create } from "zustand";

// 로그인(선택). This file is in the game bundle; supabase-js lives only in ./session.ts,
// which is loaded on demand: when a saved session exists, on the OAuth redirect back,
// or when the player presses a login button. Without the env vars the feature is hidden.

export type Provider = "google" | "kakao";
export const PROVIDERS: [Provider, string][] = [
  ["kakao", "카카오로 로그인"],
  ["google", "구글로 로그인"],
];
/** localStorage key of the Supabase session (kept apart from the admin's). */
export const AUTH_STORAGE_KEY = "lyrics-auth";

export const accountEnabled = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
);

type AccountState = {
  status: "unavailable" | "checking" | "signedOut" | "signedIn";
  user: { name: string; provider: string } | null;
  syncing: boolean;
  syncedAt: number | null;
  error: string;
};
export const useAccount = create<AccountState>(() => ({
  status: accountEnabled ? "checking" : "unavailable",
  user: null,
  syncing: false,
  syncedAt: null,
  error: "",
}));

const session = () => import("./session.ts");
const failed = () =>
  useAccount.setState({
    status: "signedOut",
    error: "로그인 기능을 불러오지 못했어요. 새로고침해 주세요.",
  });

/** Called once at startup: resumes a saved session or finishes an OAuth redirect. */
export function startAccount() {
  if (!accountEnabled) return;
  let stored = false;
  try {
    stored = localStorage.getItem(AUTH_STORAGE_KEY) !== null;
  } catch {
    /* Storage disabled: nothing to resume. */
  }
  const params = new URLSearchParams(location.search);
  if (stored || params.has("code") || params.has("error_description"))
    session()
      .then((m) => m.start())
      .catch(failed);
  else useAccount.setState({ status: "signedOut" });
}

export const signIn = (provider: Provider) =>
  session().then((m) => m.signIn(provider));
export const signOut = () => session().then((m) => m.signOut());
export const deleteAccount = () => session().then((m) => m.deleteAccount());
