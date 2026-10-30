import { create } from "zustand";
import { persist } from "zustand/middleware";
import { questions } from "./game.ts";

/** How many entries of the game store's `collected` the 도감 had when last opened, so newly
 *  added songs get a dot (기록 tab) and a NEW mark (tracks). A display hint for this browser
 *  only; not part of the saved records or account sync. */
type CollectionSeen = {
  seen: number;
  markSeen: (count: number) => void;
  /** First run in this browser: what's already collected counts as seen, so players who
   *  had songs before this existed don't get all of them marked NEW. */
  startFrom: (count: number) => void;
};

const KEY = "lyrics-collection-seen";
// Read before the store writes anything: no saved value means this browser starts now.
const firstRun = (() => {
  try {
    return localStorage.getItem(KEY) === null;
  } catch {
    return false;
  }
})();

export const useCollectionSeen = create<CollectionSeen>()(
  persist(
    (set) => ({
      seen: 0,
      markSeen: (seen) => set({ seen }),
      startFrom: (count) => {
        if (firstRun) set({ seen: count });
      },
    }),
    { name: KEY, partialize: ({ seen }) => ({ seen }) },
  ),
);

/** Whether a guessed title would add its song to the 도감 for the first time. */
export const isNewSong = (collected: readonly string[], songId: string) =>
  !collected.some(
    (id) => questions.find((q) => q.id === id)?.songId === songId,
  );
