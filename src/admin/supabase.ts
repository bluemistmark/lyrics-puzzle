import { createClient, type PostgrestError } from "@supabase/supabase-js";

const url = import.meta.env.SUPABASE_URL;
const anonKey = import.meta.env.SUPABASE_ANON_KEY;

/** Browser client with the public anon key; RLS limits it to admins. `null` until env vars are set. */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export function describeError(error: PostgrestError | Error): string {
  const code = "code" in error ? error.code : "";
  if (code === "23505") return "이미 같은 ID(또는 같은 영어 단어·곡)가 있어요.";
  if (code === "23503") return "연결된 곡이 없어요.";
  if (code === "23514") return "필수 항목이 비었거나 형식이 맞지 않아요.";
  if (code === "42501" || code === "PGRST116")
    return "권한이 없거나 항목을 찾을 수 없어요. 다시 로그인해 보세요.";
  return error.message;
}
