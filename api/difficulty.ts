// Vercel Function: POST /api/difficulty  body: { token, questionId, rating, solved, mode }
// Records how hard a finished question felt (easy | normal | hard). One vote per player
// and question; voting again replaces it. Players are the same token-hash players as
// /api/ranking, so the token is never stored.
// Self-contained on purpose (plain fetch, no local imports) so Vercel bundles it as-is;
// token and DB helpers are copied from api/ranking.ts, the ratings mirror src/difficulty.ts
// and the table is in supabase/migrations/*_difficulty.sql.

const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const TOKEN = /^[A-Za-z0-9_-]{40,64}$/;
const QUESTION_ID = /^[A-Za-z0-9_-]{1,100}$/;
export const RATINGS = ["easy", "normal", "hard"];
const MODES = ["play", "daily"];

async function playerId(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
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

export async function POST(request: Request) {
  const db = database();
  if (db instanceof Response) return db;
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<
    string,
    unknown
  >;
  const { token, questionId, rating, solved, mode } = body;
  if (typeof token !== "string" || !TOKEN.test(token))
    return json(400, { error: "플레이어 정보가 올바르지 않아요." });
  if (
    typeof questionId !== "string" ||
    !QUESTION_ID.test(questionId) ||
    typeof rating !== "string" ||
    !RATINGS.includes(rating) ||
    typeof solved !== "boolean" ||
    typeof mode !== "string" ||
    !MODES.includes(mode)
  )
    return json(400, { error: "응답 형식이 올바르지 않아요." });

  const id = await playerId(token);
  const player = await fetch(`${db.rest}/players?on_conflict=id`, {
    method: "POST",
    headers: { ...db.headers, prefer: "resolution=ignore-duplicates" },
    body: JSON.stringify({ id }),
  });
  if (!player.ok)
    return json(502, {
      error:
        "응답을 저장하지 못했어요. ranking·difficulty 마이그레이션을 실행했는지 확인하세요.",
    });
  const vote = await fetch(
    `${db.rest}/difficulty_votes?on_conflict=question_id,player_id`,
    {
      method: "POST",
      headers: { ...db.headers, prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        question_id: questionId,
        player_id: id,
        rating,
        solved,
        mode,
      }),
    },
  );
  if (!vote.ok) {
    // 23503: the question id isn't in the DB (removed, or never existed).
    const code = ((await vote.json().catch(() => ({}))) as { code?: string })
      .code;
    return code === "23503"
      ? json(400, { error: "없는 문제예요." })
      : json(502, {
          error:
            "응답을 저장하지 못했어요. difficulty 마이그레이션을 실행했는지 확인하세요.",
        });
  }
  return json(200, { ok: true });
}
