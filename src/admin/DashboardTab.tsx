import { useEffect, useMemo, useState } from "react";
import type { Catalog, Issue } from "../data/build-catalog.ts";
import { koreaDate } from "../daily.ts";
import {
  fillDays,
  shiftDate,
  solveRate,
  unitCounts,
  type DailyStat,
} from "./dashboard.ts";
import { useAdmin } from "./store";
import { describeError, supabase } from "./supabase";

const DAYS = 30;
/** 어려워요 순위에 넣을 최소 응답 수 (적으면 비율이 크게 흔들림). */
const MIN_VOTES = 3;

type Tally = { question_id: string; hard: number; total: number };
type Remote = {
  stats: DailyStat[];
  players: number | null;
  newPlayers: number | null;
  members: { total: number; new_week: number } | null;
  newReports: number | null;
  difficulty: Tally[];
};
type Target = "publish" | "reports" | "difficulty" | "ranking";
type Props = {
  catalog: Catalog;
  issues: Issue[];
  onNavigate: (tab: Target) => void;
};

const short = (date: string) => date.slice(5).replace("-", ".");
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** 요약 카드 · 오늘의 문제 추이 · 콘텐츠 현황. Loaded on demand, not kept in the admin store. */
export function DashboardTab({ catalog, issues, onNavigate }: Props) {
  const questionRows = useAdmin((s) => s.questions);
  const releases = useAdmin((s) => s.releases);
  const releasesError = useAdmin((s) => s.releasesError);
  const [today] = useState(koreaDate);
  const [data, setData] = useState<Remote>();
  const [errors, setErrors] = useState<string[]>([]);
  const [reload, setReload] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    if (!supabase) return;
    const db = supabase;
    let live = true;
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const count = { count: "exact", head: true } as const;
    Promise.all([
      db
        .from("daily_stats")
        .select("date, participants, solved, avg_hints, avg_guesses")
        .gte("date", shiftDate(today, -DAYS + 1))
        .order("date"),
      db.from("players").select("id", count),
      db.from("players").select("id", count).gte("created_at", weekAgo),
      db.rpc("member_stats").maybeSingle(),
      db.from("reports").select("id", count).eq("status", "new"),
      db
        .from("question_difficulty")
        .select("question_id, hard, total")
        .gte("total", MIN_VOTES),
    ]).then(([stats, players, newPlayers, members, reports, difficulty]) => {
      if (!live) return;
      setErrors(
        [
          stats.error &&
            `데일리 퀴즈 추이: ${describeError(stats.error)} (daily_stats 마이그레이션을 실행했는지 확인하세요.)`,
          players.error && `플레이어: ${describeError(players.error)}`,
          members.error &&
            `가입 회원: ${describeError(members.error)} (member_stats 마이그레이션을 실행했는지 확인하세요.)`,
          reports.error && `제보: ${describeError(reports.error)}`,
          difficulty.error && `난이도: ${describeError(difficulty.error)}`,
        ].filter((e): e is string => Boolean(e)),
      );
      setData({
        stats: (stats.data ?? []) as DailyStat[],
        players: players.count,
        newPlayers: newPlayers.count,
        members: members.data as Remote["members"],
        newReports: reports.count,
        difficulty: (difficulty.data ?? []) as Tally[],
      });
    });
    return () => {
      live = false;
    };
  }, [today, reload]);

  const days = useMemo(
    () => fillDays(data?.stats ?? [], today, DAYS),
    [data, today],
  );
  const units = useMemo(() => unitCounts(catalog), [catalog]);
  const hardest = useMemo(() => {
    const title = new Map(catalog.songs.map((s) => [s.id, s.title]));
    const songOf = new Map(catalog.questions.map((q) => [q.id, q.songId]));
    return [...(data?.difficulty ?? [])]
      .filter((r) => songOf.has(r.question_id))
      .sort((a, b) => b.hard / b.total - a.hard / a.total || b.total - a.total)
      .slice(0, 5)
      .map((r) => ({
        ...r,
        title: title.get(songOf.get(r.question_id)!) ?? "",
      }));
  }, [data, catalog]);

  const todayStat = days[days.length - 1];
  const shown = days[hover ?? days.length - 1];
  const lastRelease = releases[0];
  const unused = questionRows.length - catalog.questions.length;

  return (
    <section className="dashboard">
      <div className="toolbar">
        <span className="muted">기준일 {today} (한국 시간)</span>
        <span className="admin-spacer" />
        <button onClick={() => setReload((n) => n + 1)}>새로고침</button>
      </div>
      {errors.map((e) => (
        <p className="form-error" key={e}>
          {e}
        </p>
      ))}

      <div className="dash-tiles">
        <Tile
          label="데일리 퀴즈 참여"
          value={data ? `${todayStat.participants}명` : "…"}
          detail={
            todayStat.participants
              ? `정답률 ${solveRate(todayStat)}%`
              : "아직 참여자가 없어요"
          }
          onClick={() => onNavigate("ranking")}
        />
        <Tile
          label="플레이어"
          value={data?.players != null ? `${data.players}명` : "…"}
          detail={
            data?.newPlayers != null
              ? `최근 7일 신규 ${data.newPlayers}명`
              : undefined
          }
        />
        <Tile
          label="가입 회원"
          value={data?.members ? `${data.members.total}명` : "…"}
          detail={
            data?.members
              ? `최근 7일 신규 ${data.members.new_week}명`
              : undefined
          }
        />
        <Tile
          label="미처리 제보"
          value={data?.newReports != null ? `${data.newReports}건` : "…"}
          warn={Boolean(data?.newReports)}
          onClick={() => onNavigate("reports")}
        />
        <Tile
          label="마지막 게시"
          value={lastRelease ? dateTime(lastRelease.created_at) : "—"}
          detail={
            releasesError
              ? "게시 기록을 불러오지 못했어요"
              : issues.length
                ? `검증 오류 ${issues.length}개`
                : "게시 준비됨"
          }
          warn={issues.length > 0}
          onClick={() => onNavigate("publish")}
        />
      </div>
      <p className="muted">
        플레이어는 랭킹 제출·체감 난이도 응답을 한 번 이상 한 브라우저 수예요.
        일반 플레이는 서버에 기록하지 않아 여기에 포함되지 않아요. 가입 회원은
        카카오·구글로 로그인한 계정 수예요(탈퇴하면 빠져요).
      </p>

      <h2>데일리 퀴즈 · 최근 {DAYS}일</h2>
      <p className="dash-readout" aria-live="polite">
        <b>{shown.date.replaceAll("-", ".")}</b> 참여 {shown.participants}명
        {shown.participants > 0 && (
          <>
            {" "}
            · 정답 {shown.solved}명 ({solveRate(shown)}%) · 정답자 평균 힌트{" "}
            {shown.avg_hints ?? "—"}회 · 평균 입력 {shown.avg_guesses ?? "—"}개
          </>
        )}
      </p>
      <div className="dash-charts">
        <BarChart
          title="참여자 수"
          days={days}
          value={(d) => d.participants}
          unit="명"
          hover={hover}
          onHover={setHover}
        />
        <BarChart
          title="정답률"
          days={days}
          value={(d) => solveRate(d) ?? 0}
          max={100}
          unit="%"
          hover={hover}
          onHover={setHover}
        />
      </div>
      <details className="dash-table">
        <summary>표로 보기</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>날짜</th>
                <th>참여</th>
                <th>정답</th>
                <th>정답률</th>
                <th>평균 힌트</th>
                <th>평균 입력</th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr key={d.date}>
                  <td className="mono">{d.date}</td>
                  <td>{d.participants}</td>
                  <td>{d.solved}</td>
                  <td>{d.participants ? `${solveRate(d)}%` : "—"}</td>
                  <td>{d.avg_hints ?? "—"}</td>
                  <td>{d.avg_guesses ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <h2>콘텐츠 현황</h2>
      <div className="dash-tiles">
        <Tile label="게시되는 곡" value={`${catalog.songs.length}곡`} />
        <Tile
          label="게시되는 문제"
          value={`${catalog.questions.length}문제`}
          detail={unused ? `미사용 ${unused}문제 제외` : undefined}
        />
        <Tile label="영어 사전" value={`${catalog.dictionary.length}개`} />
      </div>
      <div className="dash-columns">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>유닛</th>
                <th>곡</th>
                <th>문제</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.unit}>
                  <td>{u.unit}</td>
                  <td>{u.songs}</td>
                  <td>{u.questions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>어려워요 상위</th>
                <th>곡</th>
                <th>어려워요</th>
                <th>응답</th>
              </tr>
            </thead>
            <tbody>
              {hardest.map((r) => (
                <tr key={r.question_id}>
                  <td className="mono">{r.question_id}</td>
                  <td>{r.title}</td>
                  <td>{Math.round((r.hard / r.total) * 100)}%</td>
                  <td>{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && !hardest.length && (
            <p className="muted">
              응답 {MIN_VOTES}개 이상인 문제가 아직 없어요.
            </p>
          )}
          <button className="link" onClick={() => onNavigate("difficulty")}>
            난이도 탭에서 전체 보기
          </button>
        </div>
      </div>
    </section>
  );
}

function Tile({
  label,
  value,
  detail,
  warn = false,
  onClick,
}: {
  label: string;
  value: string;
  detail?: string;
  warn?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className="dash-label">{label}</span>
      <b className="dash-value">{value}</b>
      {detail && <span className="dash-detail">{detail}</span>}
    </>
  );
  const className = `dash-tile${warn ? " warn" : ""}`;
  return onClick ? (
    <button type="button" className={className} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
}

function BarChart({
  title,
  days,
  value,
  max,
  unit,
  hover,
  onHover,
}: {
  title: string;
  days: DailyStat[];
  value: (d: DailyStat) => number;
  max?: number;
  unit: string;
  hover: number | null;
  onHover: (index: number | null) => void;
}) {
  const top = max ?? Math.max(1, ...days.map(value));
  return (
    <figure className="dash-chart">
      <figcaption>
        {title}{" "}
        <span className="muted">
          최대 {top}
          {unit}
        </span>
      </figcaption>
      <div
        className={`dash-bars${hover !== null ? " hovering" : ""}`}
        onMouseLeave={() => onHover(null)}
        role="img"
        aria-label={`${title}, 최근 ${days.length}일. 표로 보기에서 값을 확인할 수 있어요.`}
      >
        {days.map((d, i) => (
          <div
            key={d.date}
            className={`dash-col${hover === i ? " active" : ""}`}
            onMouseEnter={() => onHover(i)}
          >
            <span
              className="dash-bar"
              style={{ height: `${(value(d) / top) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="dash-axis">
        <span>{short(days[0].date)}</span>
        <span>{short(days[days.length - 1].date)}</span>
      </div>
    </figure>
  );
}
