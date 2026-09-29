// Vercel Function: DELETE /api/account  header Authorization: Bearer <user JWT>, body { token? }
// 회원 탈퇴: deletes the signed-in user (player_saves goes with it via ON DELETE CASCADE) and,
// when the ranking token is sent, that ranking player with its daily scores and 난이도 votes.
// Self-contained on purpose (plain fetch, no local imports) so Vercel bundles it as-is;
// the token hash matches api/ranking.ts.

const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const TOKEN = /^[A-Za-z0-9_-]{40,64}$/;

async function playerId(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function DELETE(request: Request) {
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
  const jwt = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/i)?.[1];
  if (!jwt) return json(401, { error: "로그인이 필요합니다." });
  const service = { apikey: key, authorization: `Bearer ${key}` };

  const who = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, authorization: `Bearer ${jwt}` },
  });
  if (!who.ok)
    return json(401, { error: "로그인이 만료됐어요. 다시 로그인하세요." });
  const userId = ((await who.json()) as { id?: string }).id;
  if (!userId) return json(401, { error: "로그인 정보를 확인할 수 없어요." });

  const body = ((await request.json().catch(() => null)) ?? {}) as {
    token?: unknown;
  };
  if (typeof body.token === "string" && TOKEN.test(body.token)) {
    const player = await fetch(
      `${url}/rest/v1/players?id=eq.${await playerId(body.token)}`,
      { method: "DELETE", headers: service },
    );
    if (!player.ok) return json(502, { error: "랭킹 기록을 지우지 못했어요." });
  }

  const removed = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: service,
  });
  if (!removed.ok) return json(502, { error: "계정을 삭제하지 못했어요." });
  return json(200, { ok: true });
}
