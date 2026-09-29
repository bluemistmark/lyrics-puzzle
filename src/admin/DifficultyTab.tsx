import { useEffect, useMemo, useState } from "react";
import { useAdmin } from "./store";
import { describeError, supabase } from "./supabase";

type Tally = {
  question_id: string;
  easy: number;
  normal: number;
  hard: number;
  gave_up: number;
  total: number;
};
type Sort = "hard" | "total";

const percent = (n: number, total: number) =>
  total ? Math.round((n / total) * 100) : 0;

/** 체감 난이도 응답 집계 (question_difficulty 뷰). Loaded on demand, not kept in the admin store. */
export function DifficultyTab() {
  const questions = useAdmin((s) => s.questions);
  const songs = useAdmin((s) => s.songs);
  const [rows, setRows] = useState<Tally[]>();
  const [error, setError] = useState("");
  const [sort, setSort] = useState<Sort>("hard");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!supabase) return;
    let live = true;
    supabase
      .from("question_difficulty")
      .select("question_id, easy, normal, hard, gave_up, total")
      .then(({ data, error }) => {
        if (!live) return;
        setError(error ? describeError(error) : "");
        setRows(error ? [] : ((data ?? []) as Tally[]));
      });
    return () => {
      live = false;
    };
  }, [reload]);

  const titles = useMemo(() => {
    const songTitle = new Map(songs.map((s) => [s.id, s.title]));
    return new Map(
      questions.map((q) => [q.id, songTitle.get(q.song_id) ?? q.song_id]),
    );
  }, [questions, songs]);
  const sorted = useMemo(
    () =>
      [...(rows ?? [])].sort((a, b) =>
        sort === "hard"
          ? b.hard / b.total - a.hard / a.total || b.total - a.total
          : b.total - a.total,
      ),
    [rows, sort],
  );
  const responses = rows?.reduce((n, r) => n + r.total, 0) ?? 0;

  return (
    <section>
      <div className="toolbar">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="정렬"
        >
          <option value="hard">어려워요 비율 높은 순</option>
          <option value="total">응답 많은 순</option>
        </select>
        <span className="admin-spacer" />
        {rows && (
          <span className="muted">
            문제 {rows.length}개 · 응답 {responses}개
          </span>
        )}
        <button onClick={() => setReload((n) => n + 1)}>새로고침</button>
      </div>
      <p className="muted">
        플레이어가 문제를 끝낸 뒤(제목 정답 또는 포기) 고른 체감 난이도예요. 한
        사람이 한 문제에 한 표이고, 다시 고르면 바뀝니다. 응답 수가 적은 문제는
        비율이 크게 흔들리니 함께 보세요.
      </p>
      {error && (
        <p className="form-error">
          {error} (difficulty 마이그레이션을 실행했는지 확인하세요.)
        </p>
      )}
      {!rows && !error && <p>불러오는 중…</p>}
      {rows && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>문제</th>
                <th>곡</th>
                <th>쉬워요</th>
                <th>보통이에요</th>
                <th>어려워요</th>
                <th>포기 후 응답</th>
                <th>응답</th>
                <th>분포</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.question_id}>
                  <td className="mono">{r.question_id}</td>
                  <td>{titles.get(r.question_id) ?? "(삭제된 문제)"}</td>
                  <td>{r.easy}</td>
                  <td>{r.normal}</td>
                  <td>
                    {r.hard}{" "}
                    <span className="muted">({percent(r.hard, r.total)}%)</span>
                  </td>
                  <td>{r.gave_up}</td>
                  <td>{r.total}</td>
                  <td>
                    <div
                      className="difficulty-bar"
                      title={`쉬워요 ${r.easy} · 보통이에요 ${r.normal} · 어려워요 ${r.hard}`}
                    >
                      <span
                        className="easy"
                        style={{ width: `${percent(r.easy, r.total)}%` }}
                      />
                      <span
                        className="normal"
                        style={{ width: `${percent(r.normal, r.total)}%` }}
                      />
                      <span
                        className="hard"
                        style={{ width: `${percent(r.hard, r.total)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="muted">아직 응답이 없어요.</p>}
        </div>
      )}
    </section>
  );
}
