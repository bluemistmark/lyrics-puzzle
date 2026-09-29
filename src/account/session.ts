import { createClient, type Session } from "@supabase/supabase-js";
import { requestJson, useRanking } from "../ranking.ts";
import { useDifficulty } from "../difficulty.ts";
import { useGame } from "../store.ts";
import { AUTH_STORAGE_KEY, useAccount, type Provider } from "./index.ts";
import { mergeSaves, parseSave } from "./save.ts";
import { applySnapshot, snapshot } from "./snapshot.ts";

// Loaded on demand (see ./index.ts). Keeps the signed-in player's records in player_saves:
// read → merge with this device → apply → write, again a few seconds after records change.

const client = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: {
      storageKey: AUTH_STORAGE_KEY,
      flowType: "pkce",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
const SYNC_DELAY_MS = 4000;

let session: Session | null = null;
let started = false;
let lastSynced = "";
let timer: number | undefined;
let running: Promise<void> | null = null;
let again = false;
let stopWatching: (() => void) | null = null;

/** Drops the OAuth parameters from the address bar after the redirect back. */
function cleanUrl() {
  const url = new URL(location.href);
  const keys = ["code", "error", "error_code", "error_description"];
  if (!keys.some((k) => url.searchParams.has(k))) return;
  keys.forEach((k) => url.searchParams.delete(k));
  history.replaceState(history.state, "", url.pathname + url.search + url.hash);
}

async function syncNow() {
  if (!session) return;
  useAccount.setState({ syncing: true, error: "" });
  try {
    const { data, error } = await client
      .from("player_saves")
      .select("data")
      .maybeSingle();
    if (error) throw error;
    const saved = parseSave(data?.data);
    applySnapshot(mergeSaves(snapshot(), saved));
    // Applying may add today's achievements; upload what the stores hold now.
    const current = snapshot();
    const text = JSON.stringify(current);
    if (text !== JSON.stringify(saved)) {
      const { error: writeError } = await client
        .from("player_saves")
        .upsert({ user_id: session.user.id, data: current });
      if (writeError) throw writeError;
    }
    lastSynced = text;
    useAccount.setState({ syncing: false, syncedAt: Date.now() });
  } catch {
    useAccount.setState({
      syncing: false,
      error: "기록을 동기화하지 못했어요. 잠시 후 다시 시도할게요.",
    });
  }
}

/** Runs one sync at a time; a request during a sync runs once more afterwards. */
function sync(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = syncNow().finally(() => {
    running = null;
    if (again) {
      again = false;
      void sync();
    }
  });
  return running;
}

function schedule() {
  window.clearTimeout(timer);
  timer = undefined;
  if (JSON.stringify(snapshot()) === lastSynced) return;
  timer = window.setTimeout(sync, SYNC_DELAY_MS);
}

function watch() {
  const onHide = () => {
    if (document.visibilityState === "hidden" && timer !== undefined) {
      window.clearTimeout(timer);
      timer = undefined;
      void sync();
    }
  };
  const stops = [
    useGame.subscribe(schedule),
    useDifficulty.subscribe(schedule),
    useRanking.subscribe(schedule),
  ];
  document.addEventListener("visibilitychange", onHide);
  stopWatching = () => {
    stops.forEach((stop) => stop());
    document.removeEventListener("visibilitychange", onHide);
    window.clearTimeout(timer);
    stopWatching = null;
  };
}

async function signedIn(next: Session) {
  session = next;
  const meta = next.user.user_metadata as Record<string, unknown>;
  const name = [meta.full_name, meta.name, meta.nickname, next.user.email].find(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
  useAccount.setState({
    status: "signedIn",
    user: {
      name: name ?? "플레이어",
      provider: String(next.user.app_metadata.provider ?? ""),
    },
    error: "",
  });
  if (!stopWatching) watch();
  await sync();
}

function signedOut(error = "") {
  session = null;
  lastSynced = "";
  stopWatching?.();
  useAccount.setState({
    status: "signedOut",
    user: null,
    syncing: false,
    syncedAt: null,
    error,
  });
}

export async function start() {
  if (started) return;
  started = true;
  client.auth.onAuthStateChange((event, next) => {
    // Keep the refreshed token; Supabase must not be called from inside this callback.
    if (next) session = next;
    if (event === "SIGNED_OUT") signedOut();
  });
  const cancelled = new URLSearchParams(location.search).has(
    "error_description",
  );
  const { data, error } = await client.auth.getSession();
  cleanUrl();
  if (data.session) await signedIn(data.session);
  else
    signedOut(
      error || cancelled ? "로그인하지 못했어요. 다시 시도해 주세요." : "",
    );
}

export async function signIn(provider: Provider) {
  await start();
  const url = new URL(location.href);
  url.hash = "";
  const { error } = await client.auth.signInWithOAuth({
    provider,
    options: { redirectTo: url.href },
  });
  if (error) throw Error("로그인을 시작하지 못했어요. 다시 시도해 주세요.");
}

export async function signOut() {
  // Save the latest records first; this device keeps its copy after signing out.
  if (session) await sync();
  await client.auth.signOut();
  signedOut();
}

export async function deleteAccount() {
  if (!session) throw Error("로그인이 필요합니다.");
  stopWatching?.();
  await requestJson("/api/account", {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${session.access_token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ token: useRanking.getState().token }),
  });
  // The ranking player is gone too; start over with a fresh anonymous one.
  useRanking.setState({ token: "", nickname: "", submitted: "", asked: false });
  await client.auth.signOut({ scope: "local" }).catch(() => {});
  signedOut();
}
