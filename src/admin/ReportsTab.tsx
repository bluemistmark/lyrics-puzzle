import { useEffect, useMemo, useState } from "react";
import { REPORT_KINDS } from "../report.ts";
import { useAdmin } from "./store";
import { describeError, supabase } from "./supabase";

type ReportRow = {
  id: number;
  created_at: string;
  kind: string;
  message: string;
  question_id: string | null;
  mode: "play" | "daily" | null;
  status: "new" | "done";
};
type Filter = "new" | "done" | "all";

const kindLabel = new Map<string, string>(REPORT_KINDS);
const time = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** 오류 제보 from the game (reports table). Loaded on demand, not kept in the admin store. */
export function ReportsTab() {
  const questions = useAdmin((s) => s.questions);
  const songs = useAdmin((s) => s.songs);
  const [rows, setRows] = useState<ReportRow[]>();
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("new");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!supabase) return;
    let live = true;
    supabase
      .from("reports")
      .select("id, created_at, kind, message, question_id, mode, status")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (!live) return;
        setError(error ? describeError(error) : "");
        setRows(error ? [] : ((data ?? []) as ReportRow[]));
      });
    return () => {
      live = false;
    };
  }, [reload]);

  const questionInfo = useMemo(() => {
    const title = new Map(songs.map((s) => [s.id, `${s.artist} · ${s.title}`]));
    return new Map(
      questions.map((q) => [
        q.id,
        { song: title.get(q.song_id) ?? q.song_id, line: q.lines[0] ?? "" },
      ]),
    );
  }, [questions, songs]);
  const shown = (rows ?? []).filter(
    (r) => filter === "all" || r.status === filter,
  );
  const newCount = rows?.filter((r) => r.status === "new").length ?? 0;

  const update = async (row: ReportRow, status: ReportRow["status"]) => {
    if (!supabase) return;
    const { error } = await supabase
      .from("reports")
      .update({ status })
      .eq("id", row.id);
    if (error) return setError(describeError(error));
    setRows((list) =>
      list?.map((r) => (r.id === row.id ? { ...r, status } : r)),
    );
  };
  const remove = async (row: ReportRow) => {
    if (!supabase || !confirm("이 제보를 삭제할까요? 되돌릴 수 없어요."))
      return;
    const { error } = await supabase.from("reports").delete().eq("id", row.id);
    if (error) return setError(describeError(error));
    setRows((list) => list?.filter((r) => r.id !== row.id));
  };

  return (
    <section>
      <div className="toolbar">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
          aria-label="상태"
        >
          <option value="new">새 제보</option>
          <option value="done">처리 완료</option>
          <option value="all">전체</option>
        </select>
        <span className="admin-spacer" />
        {rows && <span className="muted">새 제보 {newCount}개</span>}
        <button onClick={() => setReload((n) => n + 1)}>새로고침</button>
      </div>
      <p className="muted">
        게임에서 보낸 오류 제보예요(최근 500개). 연락처는 받지 않으니 반영한
        내용은 게시할 때 소식으로 알려 주세요. 개인정보 처리방침에 따라 처리가
        끝난 제보는 삭제하고, 1년 넘게 두지 마세요.
      </p>
      {error && (
        <p className="form-error">
          {error} (reports 마이그레이션을 실행했는지 확인하세요.)
        </p>
      )}
      {!rows && !error && <p>불러오는 중…</p>}
      {rows && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>접수</th>
                <th>종류</th>
                <th>문제</th>
                <th>내용</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const info = r.question_id
                  ? questionInfo.get(r.question_id)
                  : undefined;
                return (
                  <tr
                    key={r.id}
                    className={r.status === "done" ? "inactive" : undefined}
                  >
                    <td className="mono">{time(r.created_at)}</td>
                    <td>{kindLabel.get(r.kind) ?? r.kind}</td>
                    <td>
                      {r.question_id ? (
                        <>
                          <span className="mono">{r.question_id}</span>
                          {r.mode === "daily" && (
                            <span className="muted"> · 데일리 퀴즈</span>
                          )}
                          <br />
                          <span className="muted">
                            {info ? info.song : "(삭제된 문제)"}
                          </span>
                          {info?.line && (
                            <>
                              <br />
                              <span className="muted">{info.line}</span>
                            </>
                          )}
                        </>
                      ) : (
                        <span className="muted">일반</span>
                      )}
                    </td>
                    <td className="pre-line">{r.message}</td>
                    <td className="row-actions">
                      {r.status === "new" ? (
                        <button onClick={() => update(r, "done")}>
                          처리 완료
                        </button>
                      ) : (
                        <button onClick={() => update(r, "new")}>
                          되돌리기
                        </button>
                      )}
                      <button className="danger" onClick={() => remove(r)}>
                        삭제
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!shown.length && <p className="muted">제보가 없어요.</p>}
        </div>
      )}
    </section>
  );
}
