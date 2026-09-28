// Shared by the game (tokenize), catalog validation and the admin so that
// "which English words need a dictionary entry" is decided in exactly one place.

export type DictionaryEntry = {
  english: string;
  pronunciation: string;
  alternatives: string[];
};
export type Token = {
  text: string;
  pronunciation?: string;
  alternatives?: string[];
};

export const englishKey = (s: string) =>
  s.normalize("NFKC").toLowerCase().replace(/[’‘]/g, "'");
const latin = (c: string) => !!c && /[\p{Script=Latin}\d'’‘]/u.test(c);

/** Longest entries first so a phrase wins over the words inside it. */
export const sortDictionary = <T extends { english: string }>(
  entries: readonly T[],
) => [...entries].sort((a, b) => b.english.length - a.english.length);

// Entries grouped by length (longest first) and keyed by englishKey, so each
// position normalizes one slice per length instead of one per entry. Within a
// group the first entry in `sorted` order wins, same as a linear scan would.
type Index<T> = { length: number; byKey: Map<string, T> }[];
const indexes = new WeakMap<readonly object[], Index<object>>();
function indexFor<T extends { english: string }>(sorted: readonly T[]) {
  let index = indexes.get(sorted) as Index<T> | undefined;
  if (!index) {
    const groups = new Map<number, Map<string, T>>();
    for (const d of sorted) {
      const group = groups.get(d.english.length) ?? new Map<string, T>();
      const key = englishKey(d.english);
      if (!group.has(key)) group.set(key, d);
      groups.set(d.english.length, group);
    }
    index = [...groups]
      .sort((a, b) => b[0] - a[0])
      .map(([length, byKey]) => ({ length, byKey }));
    indexes.set(sorted, index);
  }
  return index;
}

/** Entry starting at `line[i]` that is not glued to other Latin letters. `sorted` comes from `sortDictionary`. */
export function entryAt<T extends { english: string }>(
  line: string,
  i: number,
  sorted: readonly T[],
): T | undefined {
  if (latin(line[i - 1] || "")) return undefined;
  for (const { length, byKey } of indexFor(sorted)) {
    if (latin(line[i + length] || "")) continue;
    const entry = byKey.get(englishKey(line.slice(i, i + length)));
    if (entry) return entry;
  }
  return undefined;
}

/** Splits a lyric line into tokens and lists English words that have no dictionary entry. */
export function scanLine(
  line: string,
  sorted: readonly DictionaryEntry[],
): { tokens: Token[]; missing: string[] } {
  const tokens: Token[] = [];
  const missing: string[] = [];
  let i = 0;
  while (i < line.length) {
    const entry = entryAt(line, i, sorted);
    if (entry) {
      tokens.push({
        text: line.slice(i, i + entry.english.length),
        pronunciation: entry.pronunciation,
        alternatives: entry.alternatives,
      });
      i += entry.english.length;
      continue;
    }
    if (/[\p{Script=Latin}]/u.test(line[i])) {
      const word = line.slice(i).match(/^[\p{Script=Latin}\d'’‘-]+/u)![0];
      missing.push(word);
      tokens.push({ text: word });
      i += word.length;
      continue;
    }
    const text =
      line.slice(i).match(/^[가-힣]+|^\s+|^[^가-힣\s\p{Script=Latin}]/u)?.[0] ||
      line[i];
    tokens.push({ text });
    i += text.length;
  }
  return { tokens, missing };
}
