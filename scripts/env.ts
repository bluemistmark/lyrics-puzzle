import { createClient } from "@supabase/supabase-js";

/** Supabase client with the service role key (bypasses RLS). Only for build scripts, never the browser. */
export function serviceClient() {
  const url = process.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw Error(
      "SUPABASE_URL(또는 SUPABASE_URL)과 SUPABASE_SERVICE_ROLE_KEY 환경 변수가 필요합니다. .env.example을 참고하세요.",
    );
  return createClient(url, key, { auth: { persistSession: false } });
}
