// 방문 통계(Vercel Web Analytics). Only page views are sent (custom events need a paid plan).
// URLs are cleaned first: the OAuth redirect briefly carries ?code=…, which must not leave the page.

/** Query parameters that may appear in analytics; `today` marks the daily-challenge share link. */
const KEPT_PARAMS = ["today"];

export function redactUrl(url: string): string {
  const parsed = new URL(url);
  for (const key of [...parsed.searchParams.keys()])
    if (!KEPT_PARAMS.includes(key)) parsed.searchParams.delete(key);
  parsed.hash = "";
  return parsed.href;
}

/** `beforeSend` for the Analytics component. */
export const beforeSend = <T extends { url: string }>(event: T): T => ({
  ...event,
  url: redactUrl(event.url),
});
