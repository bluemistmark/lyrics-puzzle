// Vercel Function: POST /api/publish
// Verifies the caller's Supabase session belongs to an admin, then triggers the
// Vercel Deploy Hook. The rebuild pulls the DB into the bundle (vercel.json).
// Self-contained on purpose (plain fetch, no local imports) so Vercel bundles it as-is.

const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export async function POST(request: Request) {
  const url = process.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!url || !serviceKey || !hook)
    return json(500, { error: "서버 환경 변수가 설정되지 않았습니다." });

  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return json(401, { error: "로그인이 필요합니다." });

  const userResponse = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: serviceKey, authorization: `Bearer ${token}` },
  });
  if (!userResponse.ok)
    return json(401, { error: "로그인이 만료됐어요. 다시 로그인하세요." });
  const email = ((await userResponse.json()) as { email?: string }).email;
  if (!email) return json(401, { error: "이메일 계정으로 로그인하세요." });

  const adminResponse = await fetch(
    `${url}/rest/v1/admins?select=email&email=eq.${encodeURIComponent(email.toLowerCase())}`,
    { headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` } },
  );
  if (!adminResponse.ok)
    return json(502, { error: "관리자 확인에 실패했습니다." });
  if (!((await adminResponse.json()) as unknown[]).length)
    return json(403, { error: "관리자 권한이 없습니다." });

  const deploy = await fetch(hook, { method: "POST" });
  if (!deploy.ok)
    return json(502, { error: `배포 요청 실패 (${deploy.status})` });
  return json(200, { ok: true });
}
