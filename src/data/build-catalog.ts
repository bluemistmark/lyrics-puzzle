import {
  englishKey,
  scanLine,
  sortDictionary,
  type DictionaryEntry,
} from "./english.ts";

// Row shapes of the Supabase tables (see supabase/migrations).
export type ArtistRow = {
  name: string;
  /** Prefix for suggested song ids (e.g. "D" → "D_073"). Letters and digits only. */
  prefix: string;
  sort_order: number;
};
export type SongRow = {
  id: string;
  artist: string;
  title: string;
  aliases: string[];
  sort_order: number;
};
export type QuestionRow = {
  id: string;
  song_id: string;
  lines: string[];
  active: boolean;
};
export type DictionaryRow = DictionaryEntry;
export type Rows = {
  artists: ArtistRow[];
  songs: SongRow[];
  questions: QuestionRow[];
  dictionary: DictionaryRow[];
};

export type Catalog = {
  songs: {
    id: string;
    artist: string;
    unit: string;
    title: string;
    aliases: string[];
  }[];
  questions: { id: string; songId: string; lines: string[] }[];
  dictionary: DictionaryEntry[];
};
export type Issue = {
  message: string;
  artist?: string;
  songId?: string;
  questionId?: string;
  english?: string;
};

const byId = (a: { id: string }, b: { id: string }) =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
const clean = (values: string[]) =>
  [...new Set(values.map((v) => v.trim()))].filter(Boolean);
export const isPrefix = (prefix: string) => /^[A-Za-z0-9]+$/.test(prefix);

export const sortArtists = (artists: readonly ArtistRow[]) =>
  [...artists].sort(
    (a, b) => a.sort_order - b.sort_order || (a.name < b.name ? -1 : 1),
  );
/** Song order used everywhere: artist order first (this is the game's unit order), then song order. */
export function compareSongs(artists: readonly ArtistRow[]) {
  const rank = new Map(sortArtists(artists).map((a, i) => [a.name, i]));
  const of = (s: SongRow) =>
    rank.get(s.artist.trim()) ?? Number.MAX_SAFE_INTEGER;
  return (a: SongRow, b: SongRow) =>
    of(a) - of(b) || a.sort_order - b.sort_order || byId(a, b);
}

/**
 * Validates DB rows and converts them into the bundled game catalog.
 * Only active questions are published, and only songs that still have one.
 * Any issue means the data must not be published.
 */
export function buildCatalog({ artists, songs, questions, dictionary }: Rows): {
  catalog: Catalog;
  issues: Issue[];
} {
  const issues: Issue[] = [];

  const artistNames = new Set<string>();
  const prefixes = new Map<string, string>();
  for (const a of artists) {
    const name = a.name.trim();
    if (!name) issues.push({ message: "가수명 누락", artist: a.name });
    if (!isPrefix(a.prefix))
      issues.push({
        message: `가수 ${name}: 접두어는 영문·숫자만 쓸 수 있어요`,
        artist: a.name,
      });
    const other = prefixes.get(a.prefix);
    if (other)
      issues.push({
        message: `접두어 중복: ${a.prefix} (${other}, ${name})`,
        artist: a.name,
      });
    prefixes.set(a.prefix, name);
    artistNames.add(name);
  }

  const entries = new Map<string, DictionaryEntry>();
  for (const row of dictionary) {
    const english = row.english.trim();
    if (!english) continue;
    const entry = {
      english,
      pronunciation: row.pronunciation.trim(),
      alternatives: clean(row.alternatives),
    };
    if (!entry.pronunciation)
      issues.push({ message: `표시발음 누락: ${english}`, english });
    const key = englishKey(english);
    const previous = entries.get(key);
    if (!previous) entries.set(key, entry);
    else if (previous.pronunciation !== entry.pronunciation)
      issues.push({ message: `영어 사전 발음 충돌: ${english}`, english });
    else
      previous.alternatives = clean([
        ...previous.alternatives,
        ...entry.alternatives,
      ]);
  }
  const sorted = sortDictionary([...entries.values()]);

  const songIds = new Set<string>();
  const idByName = new Map<string, string>();
  for (const song of songs) {
    const label = song.id || "(ID 없음)";
    if (!song.id.trim()) issues.push({ message: "곡ID 누락", songId: song.id });
    if (!song.artist.trim())
      issues.push({ message: `곡 ${label}: 가수명 누락`, songId: song.id });
    else if (!artistNames.has(song.artist.trim()))
      issues.push({
        message: `곡 ${label}: 가수 ${song.artist}이(가) 가수 목록에 없음`,
        songId: song.id,
      });
    if (!song.title.trim())
      issues.push({ message: `곡 ${label}: 곡명 누락`, songId: song.id });
    if (songIds.has(song.id))
      issues.push({ message: `곡ID 중복: ${song.id}`, songId: song.id });
    songIds.add(song.id);
    const name = `${song.artist.trim()}/${song.title.trim()}`;
    const other = idByName.get(name);
    if (other && other !== song.id)
      issues.push({
        message: `같은 곡이 여러 ID로 등록됨: ${name} (${other}, ${song.id})`,
        songId: song.id,
      });
    idByName.set(name, song.id);
  }

  const questionIds = new Set<string>();
  const published: Catalog["questions"] = [];
  for (const q of [...questions].sort(byId)) {
    const lines = q.lines.map((line) => line.trim());
    const at = (message: string) =>
      issues.push({
        message: `문제 ${q.id || "(ID 없음)"}: ${message}`,
        questionId: q.id,
      });
    if (!q.id.trim()) at("문제ID 누락");
    if (questionIds.has(q.id)) at("문제ID 중복");
    questionIds.add(q.id);
    if (!songIds.has(q.song_id)) at(`곡 ${q.song_id}이(가) 없음`);
    if (!lines[0] || !lines[1]) at("가사1·가사2는 필수");
    if (!q.active) continue;
    const missing = lines.flatMap((line) => scanLine(line, sorted).missing);
    for (const word of new Set(missing)) at(`영어 발음 누락: ${word}`);
    published.push({
      id: q.id,
      songId: q.song_id,
      lines: lines.filter(Boolean),
    });
  }
  if (!published.length) issues.push({ message: "출제 가능한 문제 없음" });

  const activeSongs = new Set(published.map((q) => q.songId));
  return {
    catalog: {
      songs: [...songs]
        .sort(compareSongs(artists))
        .filter((s) => activeSongs.has(s.id))
        .map((s) => ({
          id: s.id,
          artist: s.artist.trim(),
          unit: s.artist.trim(),
          title: s.title.trim(),
          aliases: clean(s.aliases),
        })),
      questions: published,
      dictionary: [...entries.values()],
    },
    issues,
  };
}
