// Vercel Function: POST /api/lookup  body: { urls: string[] }
// For the admin's 앨범 자동 채우기: fetches Deezer and iTunes search addresses on the server,
// since neither lets a browser call it directly. Admins only, and only those two APIs.
// Self-contained on purpose (plain fetch, no local imports) so Vercel bundles it as-is; the
// local dev server (vite.config.ts) calls `fetchAllowed` the same way.

const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const MAX_URLS = 10;
const TIMEOUT_MS = 8000;
const ALLOWED = [
  /^https:\/\/api\.deezer\.com\/search(\/album)?\?[^#]*$/,
  /^https:\/\/api\.deezer\.com\/album\/\d+$/,
  /^https:\/\/itunes\.apple\.com\/search\?[^#]*$/,
];

export const isAllowed = (url: unknown): url is string =>
  typeof url === "string" &&
  url.length <= 500 &&
  ALLOWED.some((re) => re.test(url));

/** Each address's status and JSON body (null when it isn't JSON or didn't answer). */
export async function fetchAllowed(urls: string[]) {
  return Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        return { status: res.status, body: await res.json().catch(() => null) };
      } catch {
        return { status: 0, body: null };
      }
    }),
  );
}

export async function POST(request: Request) {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
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

  const body = (await request.json().catch(() => ({}))) as { urls?: unknown };
  const urls = body.urls;
  if (
    !Array.isArray(urls) ||
    !urls.length ||
    urls.length > MAX_URLS ||
    !urls.every(isAllowed)
  )
    return json(400, { error: "검색 주소가 올바르지 않아요." });
  return json(200, { results: await fetchAllowed(urls) });
}
