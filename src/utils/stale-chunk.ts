// After a new deploy, a tab opened earlier still asks for the old build's chunk files
// (e.g. the login code), which no longer exist. Reload once to pick up the new build.
// The guard stops a reload loop when a chunk is genuinely missing.
const KEY = "lyrics-chunk-reload";
const WINDOW_MS = 60_000;

export function reloadOnStaleChunk() {
  window.addEventListener("vite:preloadError", (event) => {
    try {
      const last = Number(sessionStorage.getItem(KEY) ?? 0);
      if (Date.now() - last < WINDOW_MS) return;
      sessionStorage.setItem(KEY, String(Date.now()));
    } catch {
      return; // Without storage the loop guard can't work; let the error show instead.
    }
    event.preventDefault();
    window.location.reload();
  });
}
