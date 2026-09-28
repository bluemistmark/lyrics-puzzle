// Reads the legacy Google Sheet snapshots (data/*.csv) as DB rows. Only used for the one-time migration.
import { readFile } from "node:fs/promises";
import type { Rows } from "../src/data/build-catalog.ts";
import { englishKey } from "../src/data/english.ts";

function parseCSV(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else value += c;
  }
  if (quoted) throw Error("CSV 따옴표 오류");
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

async function records(name: string) {
  const text = await readFile(
    new URL(`../data/${name}.csv`, import.meta.url),
    "utf8",
  );
  const rows = parseCSV(text.replace(/^\uFEFF/, ""));
  const header = rows.shift()!.map((v) => v.trim());
  return rows.map((r, i) => ({
    ...Object.fromEntries(header.map((h, j) => [h, (r[j] || "").trim()])),
    _row: String(i + 2),
  })) as Record<string, string>[];
}

const list = (v: string | undefined) =>
  (v || "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

/** Converts the sheet snapshots. Throws on problems that the DB schema itself would reject. */
export async function sheetRows(): Promise<Rows> {
  const errors: string[] = [];
  const songs = new Map<string, Rows["songs"][number]>();
  const questions: Rows["questions"] = [];
  for (const r of await records("lyrics")) {
    if (!r["곡명"]) continue;
    if (!["Y", "N"].includes(r["사용여부"]))
      errors.push(`가사 ${r._row}행 사용여부 오류`);
    for (const f of ["문제ID", "곡ID", "가수명", "곡명", "가사1", "가사2"])
      if (!r[f]) errors.push(`가사 ${r._row}행 ${f} 누락`);
    if (!songs.has(r["곡ID"]))
      songs.set(r["곡ID"], {
        id: r["곡ID"],
        artist: r["가수명"],
        title: r["곡명"],
        aliases: list(r["정답별칭"]),
        sort_order: songs.size,
      });
    questions.push({
      id: r["문제ID"],
      song_id: r["곡ID"],
      lines: [r["가사1"], r["가사2"], r["가사3"]].filter(Boolean),
      active: r["사용여부"] === "Y",
    });
  }

  // The sheet allowed the same word on several rows; the DB has one row per word.
  const dictionary = new Map<string, Rows["dictionary"][number]>();
  for (const r of await records("dictionary")) {
    if (!r["영어"]) continue;
    const entry = {
      english: r["영어"],
      pronunciation: r["표시발음"],
      alternatives: list(r["추가 허용 발음"] || r["추가허용발음"]),
    };
    const key = englishKey(entry.english);
    const previous = dictionary.get(key);
    if (!previous) dictionary.set(key, entry);
    else if (previous.pronunciation !== entry.pronunciation)
      errors.push(`영어 사전 ${r._row}행 발음 충돌: ${entry.english}`);
    else
      previous.alternatives = [
        ...new Set([...previous.alternatives, ...entry.alternatives]),
      ];
  }

  // Artists in first-appearance order; prefix = most common "X" in their "X_001" song ids.
  const prefixCounts = new Map<string, Map<string, number>>();
  for (const s of songs.values()) {
    const counts = prefixCounts.get(s.artist) ?? new Map<string, number>();
    const prefix = s.id.split("_")[0];
    counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
    prefixCounts.set(s.artist, counts);
  }
  const artists = [...prefixCounts].map(([name, counts], sort_order) => ({
    name,
    prefix: [...counts].sort((a, b) => b[1] - a[1])[0][0],
    sort_order,
  }));

  if (errors.length) throw Error(errors.join("\n"));
  return {
    artists,
    songs: [...songs.values()],
    questions,
    dictionary: [...dictionary.values()],
  };
}
