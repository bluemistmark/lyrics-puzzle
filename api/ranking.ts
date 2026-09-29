// Vercel Function: /api/ranking — 오늘의 문제 일간 랭킹.
//   GET  ?date=YYYY-MM-DD (header x-ranking-token optional) → board from daily_ranking()
//   POST { token, date, solved, guesses, hints } → records the day's first finish
//   PUT  { token, nickname } → creates the player or changes the nickname
// Players have no login: the browser keeps a random token and the DB keys players by
// its SHA-256, so nobody can post or rename as someone else without the token.
// Self-contained on purpose (plain fetch, no local imports) so Vercel bundles it as-is;
// the nickname rule mirrors src/nickname.ts and the tables are in supabase/migrations/*_ranking.sql.

const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const DAY = 24 * 60 * 60 * 1000;
const KST = 9 * 60 * 60 * 1000;
const koreaDate = (now: number) =>
  new Date(now + KST).toISOString().slice(0, 10);
/** A result finished just before midnight may arrive a little after it. */
const GRACE = 10 * 60 * 1000;

const TOKEN = /^[A-Za-z0-9_-]{40,64}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function playerId(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const normalizeNickname = (name: string) =>
  name.trim().replace(/\s+/g, " ");
export function nicknameError(name: string): string | null {
  if (!name) return "닉네임을 입력하세요.";
  if (name.length < 2 || name.length > 12)
    return "닉네임은 2~12자로 입력하세요.";
  if (!/^[가-힣A-Za-z0-9 _.-]+$/.test(name))
    return "한글, 영문, 숫자, 공백과 _ . - 만 쓸 수 있어요.";
  return null;
}

const count = (v: unknown, max: number) =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;

/** Supabase REST base and service headers, or an error response naming missing env vars. */
function database() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const missing = [
      !url && "SUPABASE_URL(또는 VITE_SUPABASE_URL)",
      !key && "SUPABASE_SERVICE_ROLE_KEY",
    ].filter(Boolean);
    return json(500, {
      error: `서버 환경 변수가 설정되지 않았습니다: ${missing.join(", ")}`,
    });
  }
  return {
    rest: `${url}/rest/v1`,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
  };
}

const MIGRATION_HINT = "ranking 마이그레이션을 실행했는지 확인하세요.";

async function readBody(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  return body && typeof body === "object" ? body : {};
}

export async function GET(request: Request) {
  const db = database();
  if (db instanceof Response) return db;
  const date =
    new URL(request.url).searchParams.get("date") ?? koreaDate(Date.now());
  if (!DATE.test(date))
    return json(400, { error: "날짜 형식이 올바르지 않아요." });
  const token = request.headers.get("x-ranking-token") ?? "";
  const response = await fetch(`${db.rest}/rpc/daily_ranking`, {
    method: "POST",
    headers: db.headers,
    body: JSON.stringify({
      p_date: date,
      p_player: TOKEN.test(token) ? await playerId(token) : "",
      p_limit: 50,
    }),
  });
  if (!response.ok)
    return json(502, { error: `랭킹을 불러오지 못했어요. ${MIGRATION_HINT}` });
  return json(200, (await response.json()) as object);
}

export async function POST(request: Request) {
  const db = database();
  if (db instanceof Response) return db;
  const body = await readBody(request);
  const { token, date, solved, guesses, hints } = body;
  if (typeof token !== "string" || !TOKEN.test(token))
    return json(400, { error: "플레이어 정보가 올바르지 않아요." });
  const now = Date.now();
  const today = koreaDate(now);
  const late =
    date === koreaDate(now - DAY) &&
    now - Date.parse(`${today}T00:00:00+09:00`) < GRACE;
  if (date !== today && !late)
    return json(400, { error: "데일리 결과만 등록할 수 있어요." });
  if (
    typeof solved !== "boolean" ||
    !count(guesses, 1000) ||
    !count(hints, 100)
  )
    return json(400, { error: "결과 형식이 올바르지 않아요." });

  const id = await playerId(token);
  // Both inserts ignore duplicates: the player may exist, and only the first result of a day counts.
  const ignore = { ...db.headers, prefer: "resolution=ignore-duplicates" };
  const player = await fetch(`${db.rest}/players?on_conflict=id`, {
    method: "POST",
    headers: ignore,
    body: JSON.stringify({ id }),
  });
  if (!player.ok)
    return json(502, { error: `결과를 저장하지 못했어요. ${MIGRATION_HINT}` });
  const score = await fetch(
    `${db.rest}/daily_scores?on_conflict=date,player_id`,
    {
      method: "POST",
      headers: ignore,
      body: JSON.stringify({ date, player_id: id, solved, guesses, hints }),
    },
  );
  if (!score.ok) return json(502, { error: "결과를 저장하지 못했어요." });
  return json(200, { ok: true });
}

export async function PUT(request: Request) {
  const db = database();
  if (db instanceof Response) return db;
  const body = await readBody(request);
  if (typeof body.token !== "string" || !TOKEN.test(body.token))
    return json(400, { error: "플레이어 정보가 올바르지 않아요." });
  const nickname =
    typeof body.nickname === "string" ? normalizeNickname(body.nickname) : "";
  const error = nicknameError(nickname);
  if (error) return json(400, { error });
  const response = await fetch(`${db.rest}/players?on_conflict=id`, {
    method: "POST",
    headers: { ...db.headers, prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ id: await playerId(body.token), nickname }),
  });
  if (!response.ok)
    return json(502, {
      error: `닉네임을 저장하지 못했어요. ${MIGRATION_HINT}`,
    });
  return json(200, { ok: true, nickname });
}
