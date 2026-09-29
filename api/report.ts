// Vercel Function: POST /api/report  body: { token, kind, message, questionId?, mode? }
// 오류 제보. Stores the report for the admin "제보" tab; no contact details are taken.
// A player (token hash, as in api/ranking.ts) may send at most RECENT_LIMIT reports per
// RECENT_MINUTES to keep spam down.
// Self-contained on purpose (plain fetch, no local imports) so Vercel bundles it as-is;
// the kinds mirror src/report.ts and the table is in supabase/migrations/*_reports.sql.

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
export const REPORT_KINDS = ["lyrics", "answer", "bug", "other"];
const MODES = ["play", "daily"];
export const MESSAGE_MAX = 1000;
const RECENT_LIMIT = 5;
const RECENT_MINUTES = 10;

async function playerId(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Trims, drops control characters (keeps line breaks) and limits blank lines. */
export const cleanMessage = (text: string) =>
  text
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export async function POST(request: Request) {
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
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<
    string,
    unknown
  >;
  const { token, kind, questionId, mode } = body;
  const message =
    typeof body.message === "string" ? cleanMessage(body.message) : "";
  if (typeof token !== "string" || !TOKEN.test(token))
    return json(400, { error: "플레이어 정보가 올바르지 않아요." });
  if (typeof kind !== "string" || !REPORT_KINDS.includes(kind))
    return json(400, { error: "제보 종류를 골라 주세요." });
  if (!message) return json(400, { error: "제보 내용을 적어 주세요." });
  if (message.length > MESSAGE_MAX)
    return json(400, {
      error: `제보 내용은 ${MESSAGE_MAX}자 이하로 적어 주세요.`,
    });
  if (
    (questionId !== undefined &&
      (typeof questionId !== "string" || !QUESTION_ID.test(questionId))) ||
    (mode !== undefined && (typeof mode !== "string" || !MODES.includes(mode)))
  )
    return json(400, { error: "제보 형식이 올바르지 않아요." });

  const rest = `${url}/rest/v1/reports`;
  const headers = {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
  };
  const id = await playerId(token);
  const since = new Date(Date.now() - RECENT_MINUTES * 60_000).toISOString();
  const recent = await fetch(
    `${rest}?select=id&player_id=eq.${id}&created_at=gte.${encodeURIComponent(since)}&limit=${RECENT_LIMIT}`,
    { headers },
  );
  if (!recent.ok)
    return json(502, {
      error:
        "제보를 저장하지 못했어요. reports 마이그레이션을 실행했는지 확인하세요.",
    });
  if (((await recent.json()) as unknown[]).length >= RECENT_LIMIT)
    return json(429, {
      error: "제보가 너무 많아요. 잠시 후 다시 보내 주세요.",
    });

  const insert = await fetch(rest, {
    method: "POST",
    headers,
    body: JSON.stringify({
      kind,
      message,
      question_id: questionId ?? null,
      mode: mode ?? null,
      player_id: id,
    }),
  });
  if (!insert.ok) return json(502, { error: "제보를 저장하지 못했어요." });
  return json(200, { ok: true });
}
