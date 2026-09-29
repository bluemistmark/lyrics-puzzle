// Fake browser storage for tests that load persisted zustand stores.
// All test files run in one process (--test-isolation=none) and stores bind to the storage
// that exists when they are created, so every file must share this single instance.

const shared = globalThis as unknown as { __fakeStorage?: Map<string, string> };
const first = !shared.__fakeStorage;
export const memory = (shared.__fakeStorage ??= new Map<string, string>());

if (first) {
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: storage },
    configurable: true,
  });
}
