import { useEffect, useMemo, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { buildCatalog } from "../data/build-catalog.ts";
import { ArtistsTab } from "./ArtistsTab";
import { DashboardTab } from "./DashboardTab";
import { DictionaryTab } from "./DictionaryTab";
import { DifficultyTab } from "./DifficultyTab";
import { Login } from "./Login";
import { PublishTab } from "./PublishTab";
import { QuestionsTab } from "./QuestionsTab";
import { RankingTab } from "./RankingTab";
import { ReportsTab } from "./ReportsTab";
import { SongsTab } from "./SongsTab";
import { useAdmin } from "./store";
import { supabase } from "./supabase";

export function AdminApp() {
  if (!supabase)
    return (
      <main className="admin-center">
        <h1>설정이 필요해요</h1>
        <p>
          <code>VITE_SUPABASE_URL</code>과 <code>VITE_SUPABASE_ANON_KEY</code>{" "}
          환경 변수를 설정한 뒤 다시 빌드하세요. (<code>.env.example</code>{" "}
          참고)
        </p>
      </main>
    );
  return <AuthGate client={supabase} />;
}

function AuthGate({ client }: { client: SupabaseClient }) {
  const [session, setSession] = useState<Session | null>();
  const [adminCheck, setAdminCheck] = useState<{
    userId: string;
    ok: boolean;
  }>();
  useEffect(() => {
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = client.auth.onAuthStateChange((_event, s) =>
      setSession(s),
    );
    return () => data.subscription.unsubscribe();
  }, [client]);
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    // RLS only lets a user see their own admins row, so "a row came back" means admin.
    client
      .from("admins")
      .select("email")
      .maybeSingle()
      .then(({ data }) => setAdminCheck({ userId, ok: Boolean(data) }));
  }, [client, userId]);

  const signOut = () => client.auth.signOut();
  if (session === undefined) return <p className="admin-center">확인 중…</p>;
  if (!session) return <Login client={client} />;
  const isAdmin =
    adminCheck && adminCheck.userId === userId ? adminCheck.ok : undefined;
  if (isAdmin === undefined)
    return <p className="admin-center">권한 확인 중…</p>;
  if (!isAdmin)
    return (
      <main className="admin-center">
        <h1>관리자 권한이 없어요</h1>
        <p>
          <b>{session.user.email}</b> 계정이 관리자 목록에 없습니다. Supabase
          SQL Editor에서 <code>admins</code> 테이블에 이메일을 추가하세요.
        </p>
        <button onClick={signOut}>로그아웃</button>
      </main>
    );
  return <AdminShell email={session.user.email ?? ""} onSignOut={signOut} />;
}

type Tab =
  | "dashboard"
  | "artists"
  | "songs"
  | "questions"
  | "dictionary"
  | "publish"
  | "ranking"
  | "difficulty"
  | "reports";

function AdminShell({
  email,
  onSignOut,
}: {
  email: string;
  onSignOut: () => void;
}) {
  const artists = useAdmin((s) => s.artists);
  const songs = useAdmin((s) => s.songs);
  const questions = useAdmin((s) => s.questions);
  const dictionary = useAdmin((s) => s.dictionary);
  const status = useAdmin((s) => s.status);
  const error = useAdmin((s) => s.error);
  const load = useAdmin((s) => s.load);
  const [tab, setTab] = useState<Tab>("dashboard");
  useEffect(() => {
    load();
  }, [load]);
  // Same validation the build runs, so what is shown here is what publish will accept.
  const { catalog, issues } = useMemo(
    () => buildCatalog({ artists, songs, questions, dictionary }),
    [artists, songs, questions, dictionary],
  );
  const tabs: [Tab, string, number | null][] = [
    ["dashboard", "대시보드", null],
    ["questions", "문제", questions.length],
    ["songs", "곡", songs.length],
    ["artists", "가수", artists.length],
    ["dictionary", "영어 사전", dictionary.length],
    ["publish", "게시", issues.length],
    ["ranking", "랭킹", null],
    ["difficulty", "난이도", null],
    ["reports", "제보", null],
  ];

  return (
    <div className="admin">
      <header className="admin-header">
        <h1>가사 퍼즐 어드민</h1>
        <a href="/" target="_blank" rel="noreferrer">
          게임 열기
        </a>
        <span className="admin-spacer" />
        <span className="admin-email">{email}</span>
        <button onClick={load} disabled={status === "loading"}>
          새로고침
        </button>
        <button onClick={onSignOut}>로그아웃</button>
      </header>
      <nav className="admin-tabs" role="tablist">
        {tabs.map(([key, label, count]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
          >
            {label}
            {count !== null && (
              <span
                className={key === "publish" && count ? "badge warn" : "badge"}
              >
                {key === "publish"
                  ? count
                    ? `오류 ${count}`
                    : "준비됨"
                  : count}
              </span>
            )}
          </button>
        ))}
      </nav>
      <main className="admin-main">
        {status === "loading" && <p>불러오는 중…</p>}
        {status === "error" && (
          <p className="form-error">
            {error} <button onClick={load}>다시 시도</button>
          </p>
        )}
        {status === "ready" &&
          (tab === "dashboard" ? (
            <DashboardTab
              catalog={catalog}
              issues={issues}
              onNavigate={setTab}
            />
          ) : tab === "artists" ? (
            <ArtistsTab />
          ) : tab === "songs" ? (
            <SongsTab />
          ) : tab === "questions" ? (
            <QuestionsTab issues={issues} />
          ) : tab === "dictionary" ? (
            <DictionaryTab />
          ) : tab === "ranking" ? (
            <RankingTab />
          ) : tab === "difficulty" ? (
            <DifficultyTab />
          ) : tab === "reports" ? (
            <ReportsTab />
          ) : (
            <PublishTab catalog={catalog} issues={issues} />
          ))}
      </main>
    </div>
  );
}
