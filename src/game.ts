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
/**
 * 입력 전체를 공백 없이 합쳐 찾고, 공백으로 나눈 한 글자 단어는 따로 한 번 더 찾는다.
 * 합친 입력(`있는숨`)에서는 한 글자 토큰이 "연속 2글자" 규칙에 걸려 열리지 않기 때문이다.
 */
export function matches(
  q: Question,
  word: string,
  revealed: readonly string[] = [],
): string[] {
  const found = matchTerm(q, normalize(word), revealed);
  const parts = word.split(/\s+/).map(normalize).filter(Boolean);
  if (parts.length > 1)
    for (const part of parts)
      if (part.length === 1) found.push(...matchTerm(q, part, revealed));
  return [...new Set(found)];
}
function matchTerm(
  q: Question,
  term: string,
  revealed: readonly string[],
): string[] {
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
  return found;
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
/**
 * 단어 공개 힌트: 아직 안 열린 단어(토큰) 중 하나를 무작위로 골라 그 단어의 남은 키를 돌려준다.
 * `range`([시작, 끝) 줄)를 주면 그 줄 안에서만 고르고, 열 단어가 없으면 빈 배열.
 * 일반·데일리·내 가사가 같은 함수를 쓴다. 테스트에서는 `random`을 주입한다.
 */
export function hintKeys(
  q: Question,
  revealed: readonly string[],
  range?: readonly [number, number],
  random: () => number = Math.random,
) {
  const done = new Set(revealed);
  const words = new Map<string, string[]>();
  for (const key of allKeys(q)) {
    if (done.has(key)) continue;
    const line = Number(key.split(":")[0]);
    if (range && (line < range[0] || line >= range[1])) continue;
    const word = key.slice(0, key.lastIndexOf(":"));
    words.set(word, [...(words.get(word) ?? []), key]);
  }
  const choices = [...words.values()];
  return choices.length ? choices[Math.floor(random() * choices.length)] : [];
}
/** Unseen questions first, then ones not in `collected` (곡 도감), then a different song. */
export function pickQuestion(
  selected: string[],
  seen: string[],
  current?: string,
  collected: readonly string[] = [],
) {
  const filtered = questions.filter((q) => selected.includes(q.unit));
  const pool = filtered.length ? filtered : questions;
  const fresh = pool.filter((q) => !seen.includes(q.id));
  const unseen = fresh.length ? fresh : pool.filter((q) => q.id !== current);
  const missing = unseen.filter((q) => !collected.includes(q.id));
  const choices = missing.length ? missing : unseen;
  const currentSong = questions.find((q) => q.id === current)?.songId;
  const different = choices.filter((q) => q.songId !== currentSong);
  const actual = different.length ? different : choices.length ? choices : pool;
  return actual[Math.floor(Math.random() * actual.length)];
}
