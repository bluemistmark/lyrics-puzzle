/** Admin location kept in the URL hash: `#questions?song=D_012&q=사랑`. */
export type Route = { tab: string; params: Record<string, string> };

export function parseHash(hash: string): Route {
  const body = hash.replace(/^#/, "");
  const at = body.indexOf("?");
  const tab = decodeURIComponent(at < 0 ? body : body.slice(0, at));
  const params = Object.fromEntries(
    new URLSearchParams(at < 0 ? "" : body.slice(at + 1)),
  );
  return { tab, params };
}

/** Empty params are dropped so cleared filters leave no trace in the URL. */
export function formatHash({ tab, params }: Route): string {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== ""),
  ).toString();
  return `#${encodeURIComponent(tab)}${query ? `?${query}` : ""}`;
}
