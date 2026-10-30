// Vercel Function: /api/achievements — 업적 달성률.
//   GET  → { total, counts } (achievement_rates(); cached briefly at the edge)
//   POST { token, ids } → records which achievements the player has reached (ids only)
// A new player (one with no achievements yet) counts against a per-address hourly limit, so one
// place can't flood the rates with made-up players. The address is kept only as a salted
// hash that changes daily (rate_hits).
// Players are the same token-hash players as /api/ranking, so the token is never stored.
// Self-contained on purpose (plain fetch, no local imports) so Vercel bundles it as-is;
// token and DB helpers are copied from api/ranking.ts, the table is in
// supabase/migrations/*_achievement_unlocks.sql.

const json = (status: number, body: object, cache = "no-store") =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cache,
    },
  });

const TOKEN = /^[A-Za-z0-9_-]{40,64}$/;
/** Achievement ids: fixed ones ("solve-300") and per-unit ones ("collect-NCT 127"). */
const ID = /^[\p{L}\p{N} ._-]{1,80}$/u;
const MAX_IDS = 300;
/** New players one address may add per hour (a school or office shares one address). */
export const NEW_PLAYERS_PER_HOUR = 30;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const MIGRATION_HINT =
  "achievement_unlocks 마이그레이션을 실행했는지 확인하세요.";

/** The ids if they are a sane list of achievement ids, otherwise null. */
export function parseIds(v: unknown): string[] | null {
  if (
    !Array.isArray(v) ||
    !v.length ||
    v.length > MAX_IDS ||
    !v.every((id) => typeof id === "string" && ID.test(id))
  )
    return null;
  return [...new Set(v as string[])];
}

async function playerId(token: string) {
  return sha256(token);
}

async function sha256(text: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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

export async function GET() {
  const db = database();
  if (db instanceof Response) return db;
  const response = await fetch(`${db.rest}/rpc/achievement_rates`, {
    method: "POST",
    headers: db.headers,
    body: "{}",
  });
  if (!response.ok)
    return json(502, {
      error: `달성률을 불러오지 못했어요. ${MIGRATION_HINT}`,
    });
  // Everyone sees the same numbers: a few minutes at the edge spares the DB.
  return json(
    200,
    (await response.json()) as object,
    "public, s-maxage=300, stale-while-revalidate=600",
  );
}

export async function POST(request: Request) {
  const db = database();
  if (db instanceof Response) return db;
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<
    string,
    unknown
  >;
  const { token } = body;
  if (typeof token !== "string" || !TOKEN.test(token))
    return json(400, { error: "플레이어 정보가 올바르지 않아요." });
  const ids = parseIds(body.ids);
  if (!ids) return json(400, { error: "업적 형식이 올바르지 않아요." });

  const id = await playerId(token);
  const limited = await limitNewPlayer(request, db, id);
  if (limited) return limited;
  const player = await fetch(`${db.rest}/players?on_conflict=id`, {
    method: "POST",
    headers: { ...db.headers, prefer: "resolution=ignore-duplicates" },
    body: JSON.stringify({ id }),
  });
  if (!player.ok)
    return json(502, { error: `업적을 저장하지 못했어요. ${MIGRATION_HINT}` });
  const unlocks = await fetch(
    `${db.rest}/achievement_unlocks?on_conflict=player_id,achievement_id`,
    {
      method: "POST",
      headers: { ...db.headers, prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify(
        ids.map((achievement_id) => ({ player_id: id, achievement_id })),
      ),
    },
  );
  if (!unlocks.ok)
    return json(502, { error: `업적을 저장하지 못했어요. ${MIGRATION_HINT}` });
  return json(200, { ok: true });
}

/** The client's address as Vercel reports it ("" when unknown, e.g. locally). */
export function clientAddress(headers: Headers) {
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0] ??
    ""
  ).trim();
}

/** A 429 response when this is a new player and the address has added too many this hour;
 *  otherwise records the new player against the address and returns null. */
async function limitNewPlayer(
  request: Request,
  db: { rest: string; headers: Record<string, string> },
  id: string,
) {
  const address = clientAddress(request.headers);
  if (!address) return null;
  const known = await fetch(
    `${db.rest}/achievement_unlocks?select=player_id&player_id=eq.${id}&limit=1`,
    { headers: db.headers },
  );
  if (!known.ok)
    return json(502, { error: `업적을 저장하지 못했어요. ${MIGRATION_HINT}` });
  if (((await known.json()) as unknown[]).length) return null;

  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  const key = await sha256(
    `${process.env.SUPABASE_SERVICE_ROLE_KEY}:${day}:${address}`,
  );
  const since = new Date(now - HOUR).toISOString();
  const recent = await fetch(
    `${db.rest}/rate_hits?select=at&bucket=eq.new-player&key=eq.${key}&at=gte.${encodeURIComponent(since)}&limit=${NEW_PLAYERS_PER_HOUR}`,
    { headers: db.headers },
  );
  if (!recent.ok)
    return json(502, {
      error:
        "업적을 저장하지 못했어요. rate_hits 마이그레이션을 실행했는지 확인하세요.",
    });
  if (((await recent.json()) as unknown[]).length >= NEW_PLAYERS_PER_HOUR)
    return json(429, { error: "잠시 뒤 다시 시도해 주세요." });
  await fetch(`${db.rest}/rate_hits`, {
    method: "POST",
    headers: db.headers,
    body: JSON.stringify({ bucket: "new-player", key }),
  });
  // Rows older than a day are no use to any limit.
  await fetch(
    `${db.rest}/rate_hits?at=lt.${encodeURIComponent(new Date(now - DAY).toISOString())}`,
    { method: "DELETE", headers: db.headers },
  );
  return null;
}
