import { create } from "zustand";
import { formatHash, parseHash, type Route } from "./route";

type RouteStore = Route & {
  /** Opens a tab (a new history entry, so the back button returns). */
  go: (tab: string, params?: Record<string, string>) => void;
  /** Changes one filter of the current tab in place. */
  setParam: (key: string, value: string) => void;
};

const read = () => parseHash(location.hash);

export const useRoute = create<RouteStore>()((set, get) => ({
  ...read(),
  go: (tab, params = {}) => {
    history.pushState(null, "", formatHash({ tab, params }));
    set({ tab, params });
  },
  setParam: (key, value) => {
    const params = { ...get().params, [key]: value };
    history.replaceState(null, "", formatHash({ tab: get().tab, params }));
    set({ params });
  },
}));

addEventListener("hashchange", () => useRoute.setState(read()));
addEventListener("popstate", () => useRoute.setState(read()));

/** A filter that survives refreshes and can be shared as a link. */
export function useRouteParam(key: string, fallback = "") {
  const value = useRoute((s) => s.params[key]) ?? fallback;
  const setParam = useRoute((s) => s.setParam);
  return [value, (next: string) => setParam(key, next)] as const;
}
