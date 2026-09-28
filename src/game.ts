import { catalog } from "./catalog.ts";
export type Token = {
  text: string;
  pronunciation?: string;
  alternatives?: string[];
};
export type Song = {
  id: string;
  artist: string;
  unit: string;
  title: string;
  aliases: string[];
};
export type Question = {
  id: string;
  songId: string;
  section: string;
  unit: string;
  title: string;
  lines: Token[][];
};
export const normalize = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, "");
const englishKey = (s: string) =>
  s.normalize("NFKC").toLowerCase().replace(/[’‘]/g, "'");
const hangul = (c: string) => /^[가-힣]$/.test(c);
export const initial = (c: string) => {
  const n = c.charCodeAt(0) - 0xac00;
  return n >= 0 && n <= 11171
    ? "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"[Math.floor(n / 588)]
    : c;
};
const dictionary = [...catalog.dictionary].sort(
  (a, b) => b.english.length - a.english.length,
);
const latin = (c: string) => !!c && /[\p{Script=Latin}\d'’‘]/u.test(c);
export function tokenize(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < line.length) {
    const entry = dictionary.find(
      (d) =>
        englishKey(line.slice(i, i + d.english.length)) ===
          englishKey(d.english) &&
        !latin(line[i - 1] || "") &&
        !latin(line[i + d.english.length] || ""),
    );
    if (entry) {
      tokens.push({
        text: line.slice(i, i + entry.english.length),
        pronunciation: entry.pronunciation,
        alternatives: entry.alternatives,
      });
      i += entry.english.length;
      continue;
    }
    if (/[\p{Script=Latin}]/u.test(line[i]))
      throw Error(`영어 사전에 없는 단어: ${line.slice(i).split(/\s/)[0]}`);
    const text =
      line.slice(i).match(/^[가-힣]+|^\s+|^[^가-힣\s\p{Script=Latin}]/u)?.[0] ||
      line[i];
    tokens.push({ text });
    i += text.length;
  }
  return tokens;
}
export const songs: Song[] = catalog.songs;
export const questions: Question[] = catalog.questions.map((q) => {
  const song = songs.find((s) => s.id === q.songId)!;
  return {
    ...q,
    section: "",
    unit: song.unit,
    title: song.title,
    lines: q.lines.map(tokenize),
  };
});
export const units = [...new Set(songs.map((s) => s.unit))];
export function titleMatches(q: Question, title: string) {
  const song = songs.find((s) => s.id === q.songId)!;
  const parts = [...song.title.matchAll(/\(([^)]+)\)/g)].map((m) => m[1]);
  const base = song.title.replace(/\s*\([^)]*\)/g, "").trim();
  return [song.title, base, ...parts, ...song.aliases].some(
    (v) => normalize(v) === normalize(title) && normalize(title).length > 0,
  );
}
export function matches(
  q: Question,
  word: string,
  revealed: readonly string[] = [],
): string[] {
  const term = normalize(word);
  if (!term) return [];
  const found: string[] = [];
  q.lines.forEach((line, l) =>
    line.forEach((t, w) => {
      if (t.pronunciation) {
        if (
          [t.text, t.pronunciation, ...(t.alternatives || [])].some(
            (v) => normalize(v) === term,
          )
        )
          found.push(`${l}:${w}:en`);
        return;
      }
      if (![...t.text].some(hangul)) return;
      const text = normalize(t.text);
      if (term.length === 1) {
        const prefix = `${l}:${w}:`;
        const partiallyRevealed = revealed.some((key) =>
          key.startsWith(prefix),
        );
        if (text === term || partiallyRevealed) {
          for (let j = 0; j < text.length; j++)
            if (text[j] === term) found.push(`${l}:${w}:${j}`);
        }
        return;
      }
      for (let a = 0; a < text.length; a++) {
        for (let b = 0; b < term.length; b++) {
          let length = 0;
          while (
            a + length < text.length &&
            b + length < term.length &&
            text[a + length] === term[b + length]
          )
            length++;
          if (length >= 2)
            for (let j = a; j < a + length; j++) found.push(`${l}:${w}:${j}`);
        }
      }
    }),
  );
  return [...new Set(found)];
}
export function allKeys(q: Question) {
  return q.lines.flatMap((line, l) =>
    line.flatMap((t, w) =>
      t.pronunciation
        ? [`${l}:${w}:en`]
        : [...t.text].flatMap((c, i) => (hangul(c) ? [`${l}:${w}:${i}`] : [])),
    ),
  );
}
export function progress(q: Question, revealed: string[]) {
  const keys = allKeys(q);
  return {
    count: keys.filter((k) => revealed.includes(k)).length,
    total: keys.length,
  };
}
export function pickQuestion(
  selected: string[],
  seen: string[],
  current?: string,
) {
  const filtered = questions.filter((q) => selected.includes(q.unit));
  const pool = filtered.length ? filtered : questions;
  const fresh = pool.filter((q) => !seen.includes(q.id));
  const choices = fresh.length ? fresh : pool.filter((q) => q.id !== current);
  const currentSong = questions.find((q) => q.id === current)?.songId;
  const different = choices.filter((q) => q.songId !== currentSong);
  const actual = different.length ? different : choices.length ? choices : pool;
  return actual[Math.floor(Math.random() * actual.length)];
}
