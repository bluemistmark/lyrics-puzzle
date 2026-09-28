// Vercel Function: POST /api/publish  body: { release: ReleaseDraft | null }
// Verifies the caller's Supabase session belongs to an admin, records the release
// (the game's 소식 entry), then triggers the Vercel Deploy Hook. The rebuild pulls
// the DB — including this release — into the bundle (vercel.json).
// Self-contained on purpose (plain fetch, no local imports) so Vercel bundles it as-is;
// the draft shape mirrors ReleaseDraft in src/data/releases.ts.

const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const strings = (v: unknown, max: number, maxLength: number) =>
  Array.isArray(v) &&
  v.length <= max &&
  v.every((s) => typeof s === "string" && s.length <= maxLength);
const count = (v: unknown) => Number.isInteger(v) && (v as number) >= 0;

/** Returns the draft if it has the expected shape and sane sizes, otherwise null. */
function parseDraft(v: unknown) {
  if (typeof v !== "object" || v === null) return null;
  const d = v as Record<string, unknown>;
  const songs = d.added_songs;
  const ok =
    strings(d.features, 20, 200) &&
    typeof d.note === "string" &&
    d.note.length <= 1000 &&
    Array.isArray(songs) &&
    songs.length <= 2000 &&
    songs.every(
      (s) =>
        typeof s === "object" &&
        s !== null &&
        ["id", "title", "artist"].every(
          (k) => typeof (s as Record<string, unknown>)[k] === "string",
        ),
    ) &&
    count(d.added_questions) &&
    count(d.removed_questions) &&
    strings(d.song_ids, 20000, 100) &&
    strings(d.question_ids, 20000, 100);
  if (!ok) return null;
  const { features, note, added_questions, removed_questions } = d;
  return {
    features,
    note,
    added_songs: songs,
    added_questions,
    removed_questions,
    song_ids: d.song_ids,
    question_ids: d.question_ids,
  };
}

export async function POST(request: Request) {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
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

  const body = (await request.json().catch(() => ({}))) as {
    release?: unknown;
  };
  const draft = body.release == null ? null : parseDraft(body.release);
  if (body.release != null && !draft)
    return json(400, { error: "소식 형식이 올바르지 않아요." });

  const rest = `${url}/rest/v1/releases`;
  const service = {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
  };
  let release: { id: number } | null = null;
  if (draft) {
    // Insert before triggering the build so the build sees this release.
    const insert = await fetch(rest, {
      method: "POST",
      headers: {
        ...service,
        "content-type": "application/json",
        prefer: "return=representation",
      },
      body: JSON.stringify(draft),
    });
    if (!insert.ok)
      return json(502, {
        error: `소식 저장 실패 (${insert.status}). releases 마이그레이션을 실행했는지 확인하세요.`,
      });
    release = ((await insert.json()) as { id: number }[])[0];
  }

  const deploy = await fetch(hook, { method: "POST" });
  if (!deploy.ok) {
    // Nothing will be deployed, so don't leave a release that never went live.
    if (release)
      await fetch(`${rest}?id=eq.${release.id}`, {
        method: "DELETE",
        headers: service,
      });
    return json(502, { error: `배포 요청 실패 (${deploy.status})` });
  }
  return json(200, { ok: true, release });
}
