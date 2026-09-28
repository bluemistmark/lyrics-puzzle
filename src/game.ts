import { catalog } from "./catalog.ts";
import {
  scanLine,
  sortDictionary,
  type DictionaryEntry,
  type Token,
} from "./data/english.ts";
import type { NewsItem } from "./data/releases.ts";
export type { NewsItem, Token };
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
const hangul = (c: string) => /^[가-힣]$/.test(c);
export const initial = (c: string) => {
  const n = c.charCodeAt(0) - 0xac00;
  return n >= 0 && n <= 11171
    ? "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"[Math.floor(n / 588)]
    : c;
};
const dictionary = sortDictionary(catalog.dictionary);
/** `sorted` must come from `sortDictionary`; defaults to the bundled dictionary. */
export function tokenize(
  line: string,
  sorted: readonly DictionaryEntry[] = dictionary,
): Token[] {
  const { tokens, missing } = scanLine(line, sorted);
  if (missing.length) throw Error(`영어 사전에 없는 단어: ${missing[0]}`);
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
    lines: q.lines.map((line) => tokenize(line)),
  };
});
export const units = [...new Set(songs.map((s) => s.unit))];
/** 소식 tab entries, newest first (built from the releases table at deploy time). */
export const news: NewsItem[] = catalog.news;
export function titleMatches(q: Question, title: string) {
  return songTitleMatches(
    songs.find((s) => s.id === q.songId)!,
    title,
  );
}
/** Accepts the full title, the title without parentheses, each parenthesized part and aliases. */
export function songTitleMatches(
  song: Pick<Song, "title" | "aliases">,
  title: string,
) {
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
