import { useEffect, useMemo, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { buildCatalog } from "../data/build-catalog.ts";
import { draftRelease } from "../data/releases.ts";
import { albumIssues } from "./album-issues.ts";
import { AlbumsTab } from "./AlbumsTab";
import { ArtistsTab } from "./ArtistsTab";
import { DashboardTab } from "./DashboardTab";
import { DictionaryTab } from "./DictionaryTab";
import { DifficultyTab } from "./DifficultyTab";
import { HistoryTab } from "./HistoryTab";
import { Login } from "./Login";
import { PublishTab } from "./PublishTab";
import { QuestionsTab } from "./QuestionsTab";
import { RankingTab } from "./RankingTab";
import { ReportsTab } from "./ReportsTab";
import { SettingsTab } from "./SettingsTab";
import { SongsTab } from "./SongsTab";
import { useAdmin } from "./store";
import { supabase } from "./supabase";
import { useRoute } from "./useRoute";

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

const TABS = [
  "dashboard",
  "artists",
  "songs",
  "albums",
  "questions",
  "dictionary",
  "publish",
  "ranking",
  "difficulty",
  "settings",
  "reports",
  "history",
] as const;
type Tab = (typeof TABS)[number];
const isTab = (value: string): value is Tab =>
  (TABS as readonly string[]).includes(value);

function AdminShell({
  email,
  onSignOut,
}: {
  email: string;
  onSignOut: () => void;
}) {
  const artists = useAdmin((s) => s.artists);
  const songs = useAdmin((s) => s.songs);
  const albums = useAdmin((s) => s.albums);
  const questions = useAdmin((s) => s.questions);
  const dictionary = useAdmin((s) => s.dictionary);
  const settings = useAdmin((s) => s.settings);
  const status = useAdmin((s) => s.status);
  const error = useAdmin((s) => s.error);
  const releases = useAdmin((s) => s.releases);
  const newReports = useAdmin((s) => s.newReports);
  const unpublished = useAdmin((s) => s.unpublished);
  const countUnpublished = useAdmin((s) => s.countUnpublished);
  const load = useAdmin((s) => s.load);
  const route = useRoute((s) => s.tab);
  const go = useRoute((s) => s.go);
  const replaceRoute = useRoute((s) => s.replace);
  const tab: Tab = isTab(route) ? route : "dashboard";
  // An unknown tab in the URL would otherwise stick to every later filter change.
  useEffect(() => {
    if (!isTab(route)) replaceRoute("dashboard");
  }, [route, replaceRoute]);
  const setTab = (next: Tab) => go(next);
  useEffect(() => {
    load();
  }, [load]);
  // Every saved edit lands in audit_log, so recount whenever the data changes.
  useEffect(() => {
    if (status === "ready") countUnpublished();
  }, [
    status,
    artists,
    songs,
    albums,
    questions,
    dictionary,
    settings,
    countUnpublished,
  ]);
  // Same validation the build runs, so what is shown here is what publish will accept.
  const { catalog, issues } = useMemo(
    () => buildCatalog({ artists, songs, questions, dictionary, settings }),
    [artists, songs, questions, dictionary, settings],
  );
  // Badges show what needs attention: errors, unhandled reports, unpublished changes.
  const questionIssues = new Set(
    issues.flatMap((i) => (i.questionId ? [i.questionId] : [])),
  ).size;
  // Prefer the audit log (counts edits too); fall back to added/removed questions.
  const draftChanges = useMemo(() => {
    if (!releases[0]) return null;
    const d = draftRelease(catalog, releases[0], "", "");
    return d.added_questions + d.removed_questions;
  }, [catalog, releases]);
  const pending = unpublished ?? draftChanges;
  const albumsToCheck = useMemo(
    () =>
      albums.filter(
        (a) =>
          albumIssues(
            a,
            songs.filter((s) => s.album_id === a.id),
            albums,
          ).length,
      ).length,
    [albums, songs],
  );
  type Badge = { text: string | number; warn?: boolean };
  const tabs: [Tab, string, Badge | null][] = [
    ["dashboard", "대시보드", null],
    [
      "questions",
      "문제",
      questionIssues
        ? { text: `오류 ${questionIssues}`, warn: true }
        : { text: questions.length },
    ],
    ["songs", "곡", { text: songs.length }],
    [
      "albums",
      "앨범",
      albumsToCheck
        ? { text: `확인 ${albumsToCheck}`, warn: true }
        : { text: albums.length },
    ],
    ["artists", "가수", { text: artists.length }],
    ["dictionary", "영어 사전", { text: dictionary.length }],
    [
      "publish",
      "게시",
      issues.length
        ? { text: `오류 ${issues.length}`, warn: true }
        : pending
          ? { text: `변경 ${pending}`, warn: true }
          : { text: pending === 0 ? "최신" : "준비됨" },
    ],
    ["ranking", "랭킹", null],
    ["difficulty", "난이도", null],
    ["settings", "출제 설정", null],
    [
      "reports",
      "제보",
      newReports ? { text: `새 ${newReports}`, warn: true } : null,
    ],
    ["history", "이력", null],
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
        {tabs.map(([key, label, badge]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
          >
            {label}
            {badge && (
              <span className={badge.warn ? "badge warn" : "badge"}>
                {badge.text}
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
          ) : tab === "albums" ? (
            <AlbumsTab />
          ) : tab === "questions" ? (
            <QuestionsTab issues={issues} />
          ) : tab === "dictionary" ? (
            <DictionaryTab />
          ) : tab === "ranking" ? (
            <RankingTab />
          ) : tab === "difficulty" ? (
            <DifficultyTab />
          ) : tab === "settings" ? (
            <SettingsTab />
          ) : tab === "reports" ? (
            <ReportsTab />
          ) : tab === "history" ? (
            <HistoryTab />
          ) : (
            <PublishTab catalog={catalog} issues={issues} />
          ))}
      </main>
    </div>
  );
}
