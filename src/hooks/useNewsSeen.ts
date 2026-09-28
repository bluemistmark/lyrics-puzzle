import { useState } from "react";

const key = "lyrics-news-seen";

function readSeen() {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0; // Storage may be disabled; the dot then shows until marked this session.
  }
}

/** Tracks the newest 소식 id this browser has seen, to show an "unread" dot. */
export function useNewsSeen(latestId: number) {
  const [seen, setSeen] = useState(readSeen);
  const markSeen = () => {
    setSeen(latestId);
    try {
      localStorage.setItem(key, String(latestId));
    } catch {
      /* Session-only fallback. */
    }
  };
  return { unread: latestId > seen, markSeen };
}
