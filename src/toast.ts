import { create } from "zustand";

/** One short message shown above the tab bar, one at a time in order. Only for what the
 *  screen doesn't already show: things done off screen (copied, sent, saved), failures, and
 *  passing notes. */
export type Toast = {
  id: number;
  text: string;
  /** Failures read as errors and stay a little longer. */
  error?: boolean;
  /** One way to act on it (e.g. 다시 시도). */
  action?: { label: string; run: () => void };
};

type ToastStore = {
  queue: Toast[];
  show: (text: string, options?: Omit<Toast, "id" | "text">) => void;
  dismiss: (id: number) => void;
};

let next = 1;

export const useToast = create<ToastStore>()((set) => ({
  queue: [],
  show: (text, options) =>
    set((s) =>
      // The same message already waiting is not queued twice.
      s.queue.some((t) => t.text === text)
        ? s
        : { queue: [...s.queue, { id: next++, text, ...options }] },
    ),
  dismiss: (id) => set((s) => ({ queue: s.queue.filter((t) => t.id !== id) })),
}));

/** Shows a toast (callable from anywhere, not only components). */
export const toast = (text: string, options?: Omit<Toast, "id" | "text">) =>
  useToast.getState().show(text, options);
