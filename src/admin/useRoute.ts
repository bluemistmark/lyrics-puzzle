import { create } from "zustand";
import { formatHash, parseHash, type Route } from "./route";

type RouteStore = Route & {
  /** Opens a tab (a new history entry, so the back button returns). */
  go: (tab: string, params?: Record<string, string>) => void;
  /** Changes one filter of the current tab in place. */
  setParam: (key: string, value: string) => void;
  /** Rewrites the URL without a history entry (e.g. to fix an unknown tab). */
  replace: (tab: string, params?: Record<string, string>) => void;
  /** Clears the current tab's filters, keeping the listed params (e.g. the sort). */
  clearParams: (keep?: string[]) => void;
};

const read = () => parseHash(location.hash);

export const useRoute = create<RouteStore>()((set, get) => ({
  ...read(),
  go: (tab, params = {}) => {
    history.pushState(null, "", formatHash({ tab, params }));
    set({ tab, params });
  },
  replace: (tab, params = {}) => {
    history.replaceState(null, "", formatHash({ tab, params }));
    set({ tab, params });
  },
  clearParams: (keep = []) => {
    const params = Object.fromEntries(
      Object.entries(get().params).filter(([key]) => keep.includes(key)),
    );
    history.replaceState(null, "", formatHash({ tab: get().tab, params }));
    set({ params });
  },
  setParam: (key, value) => {
    const params = { ...get().params, [key]: value };
    history.replaceState(null, "", formatHash({ tab: get().tab, params }));
    set({ params });
  },
}));

addEventListener("hashchange", () => useRoute.setState(read()));
addEventListener("popstate", () => useRoute.setState(read()));

/**
 * A filter that survives refreshes and can be shared as a link. With `allowed`,
 * a value typed into the URL that isn't in the list reads as `fallback`.
 */
export function useRouteParam<T extends string = string>(
  key: string,
  fallback = "" as T,
  allowed?: readonly T[],
) {
  const raw = useRoute((s) => s.params[key]);
  const value = (
    raw !== undefined && (!allowed || allowed.includes(raw as T))
      ? raw
      : fallback
  ) as T;
  const setParam = useRoute((s) => s.setParam);
  return [value, (next: T) => setParam(key, next)] as const;
}
