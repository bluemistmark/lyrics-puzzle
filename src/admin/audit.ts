/** One row of `audit_log` (see supabase/migrations/20261008000000_audit_log.sql). */
export type AuditRow = {
  id: number;
  at: string;
  /** Admin email; null when changed with the service role or in the SQL Editor. */
  actor: string | null;
  table_name: string;
  action: "insert" | "update" | "delete";
  row_key: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
};
export type AuditChange = { field: string; before: string; after: string };

export const AUDIT_TABLES: [table: string, label: string][] = [
  ["questions", "문제"],
  ["songs", "곡"],
  ["albums", "앨범"],
  ["artists", "가수"],
  ["dictionary", "영어 사전"],
  ["game_settings", "출제 설정"],
];
export const ACTION_LABELS = {
  insert: "추가",
  update: "수정",
  delete: "삭제",
} as const;

const FIELD_LABELS: Record<string, string> = {
  id: "ID",
  name: "가수명",
  prefix: "접두어",
  sort_order: "순서",
  main: "NCT 유닛",
  artist: "가수",
  title: "곡명",
  aliases: "별칭",
  album: "앨범",
  album_id: "앨범",
  title_track: "타이틀곡",
  released_on: "발매일",
  kind: "종류",
  cover_url: "커버",
  external_id: "출처",
  song_id: "곡",
  lines: "가사",
  active: "출제 사용",
  english: "영어",
  pronunciation: "표시발음",
  alternatives: "추가 허용 발음",
  known_weight: "아는 곡 가중치",
  unknown_weight: "모르는 곡 가중치",
  min_signal_songs: "적용 기준 곡 수",
};
/** Bookkeeping columns that say nothing about the content. */
const IGNORED = new Set(["updated_at"]);

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(formatValue).join(" / ");
  if (typeof value === "boolean") return value ? "예" : "아니오";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Fields that differ between the two row snapshots, labelled in Korean, in column order. */
export function auditChanges(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): AuditChange[] {
  const fields = [
    ...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]),
  ].filter((f) => !IGNORED.has(f));
  return fields.flatMap((field) => {
    const old = formatValue(before?.[field]);
    const next = formatValue(after?.[field]);
    return old === next
      ? []
      : [{ field: FIELD_LABELS[field] ?? field, before: old, after: next }];
  });
}
