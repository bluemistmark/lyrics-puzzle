import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export function Login({ client }: { client: SupabaseClient }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="admin-center">
      <form
        className="login"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const { error } = await client.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          setBusy(false);
          if (error) setError("이메일 또는 비밀번호가 맞지 않아요.");
        }}
      >
        <h1>가사 퍼즐 어드민</h1>
        <label>
          이메일
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <p className="form-error" role="alert">
          {error}
        </p>
        <button className="primary" disabled={busy}>
          {busy ? "로그인 중…" : "로그인"}
        </button>
      </form>
    </main>
  );
}
