import { useEffect, useState } from "react";
import { koreaDate } from "../daily.ts";
import { describeError, supabase } from "./supabase";

type ScoreRow = {
  player_id: string;
  solved: boolean;
  hints: number;
  guesses: number;
  created_at: string;
  players: { nickname: string | null; hidden: boolean } | null;
};

/** Same order as daily_ranking(): solvers by hints → guesses → time, then give-ups. */
const byRank = (a: ScoreRow, b: ScoreRow) =>
  Number(b.solved) - Number(a.solved) ||
  a.hints - b.hints ||
  a.guesses - b.guesses ||
  a.created_at.localeCompare(b.created_at);

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
  });

/** 오늘의 문제 랭킹 기록을 보고 부적절한 닉네임을 숨깁니다. Loaded on demand, not kept in the admin store. */
export function RankingTab() {
  const [date, setDate] = useState(koreaDate);
  const [rows, setRows] = useState<ScoreRow[]>();
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!supabase) return;
    let live = true;
    supabase
      .from("daily_scores")
      .select(
        "player_id, solved, hints, guesses, created_at, players(nickname, hidden)",
      )
      .eq("date", date)
      .then(({ data, error }) => {
        if (!live) return;
        setError(error ? describeError(error) : "");
        setRows(
          error ? [] : ((data ?? []) as unknown as ScoreRow[]).sort(byRank),
        );
      });
    return () => {
      live = false;
    };
  }, [date, reload]);

  const toggle = async (row: ScoreRow) => {
    if (!supabase || !row.players) return;
    const hidden = !row.players.hidden;
    const { error } = await supabase
      .from("players")
      .update({ hidden })
      .eq("id", row.player_id);
    if (error) return setError(describeError(error));
    // A player's nickname is hidden on every day, so reload rather than patch one row.
    setReload((n) => n + 1);
  };

  const solved = rows?.filter((r) => r.solved).length ?? 0;
  return (
    <section>
      <div className="toolbar">
        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          aria-label="날짜"
        />
        <span className="admin-spacer" />
        {rows && (
          <span className="muted">
            참여 {rows.length}명 · 정답 {solved}명
          </span>
        )}
        <button onClick={() => setReload((n) => n + 1)}>새로고침</button>
      </div>
      <p className="muted">
        숨긴 플레이어는 모든 날짜의 순위 목록에서 빠지고 참여자 수에만 남습니다.
        닉네임이 없는 플레이어는 원래 순위에 나오지 않아요.
      </p>
      {error && (
        <p className="form-error">
          {error} (ranking 마이그레이션을 실행했는지 확인하세요.)
        </p>
      )}
      {!rows && !error && <p>불러오는 중…</p>}
      {rows && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>닉네임</th>
                <th>결과</th>
                <th>힌트</th>
                <th>단어</th>
                <th>제출</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.player_id}>
                  <td className={row.players?.hidden ? "muted" : undefined}>
                    {row.players?.nickname ?? (
                      <span className="muted">(없음)</span>
                    )}
                    {row.players?.hidden && " · 숨김"}
                  </td>
                  <td>{row.solved ? "정답" : "포기"}</td>
                  <td>{row.hints}</td>
                  <td>{row.guesses}</td>
                  <td className="mono">{time(row.created_at)}</td>
                  <td className="row-actions">
                    {row.players?.nickname && (
                      <button
                        className={row.players.hidden ? undefined : "danger"}
                        onClick={() => toggle(row)}
                      >
                        {row.players.hidden ? "숨김 해제" : "숨기기"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="muted">이 날짜의 기록이 없어요.</p>}
        </div>
      )}
    </section>
  );
}
