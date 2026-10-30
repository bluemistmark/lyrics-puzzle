import { useEffect, useState } from "react";
import {
  ACTION_LABELS,
  AUDIT_TABLES,
  auditChanges,
  type AuditRow,
} from "./audit";
import { describeError, supabase } from "./supabase";
import { useRouteParam } from "./useRoute";

const LIMIT = 200;
const tableLabel = new Map(AUDIT_TABLES);
const time = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** 변경 이력 (audit_log, written by DB triggers). Loaded on demand, not kept in the admin store. */
export function HistoryTab() {
  const [table, setTable] = useRouteParam("table");
  const [key, setKey] = useRouteParam("q");
  const [rows, setRows] = useState<AuditRow[]>();
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!supabase) return;
    let live = true;
    let query = supabase
      .from("audit_log")
      .select("id, at, actor, table_name, action, row_key, before, after")
      .order("at", { ascending: false })
      .limit(LIMIT);
    if (table) query = query.eq("table_name", table);
    if (key.trim()) query = query.ilike("row_key", `%${key.trim()}%`);
    // Typing in the key box shouldn't fire a request per keystroke.
    const timer = setTimeout(
      () =>
        query.then(({ data, error }) => {
          if (!live) return;
          setError(error ? describeError(error) : "");
          setRows(error ? [] : ((data ?? []) as AuditRow[]));
        }),
      250,
    );
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [table, key, reload]);

  return (
    <section>
      <div className="toolbar">
        <select
          value={table}
          onChange={(e) => setTable(e.target.value)}
          aria-label="대상"
        >
          <option value="">전체</option>
          {AUDIT_TABLES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="문제ID, 곡ID, 앨범ID, 가수명, 영어"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <span className="admin-spacer" />
        {rows && (
          <span className="muted">
            최근 {rows.length}건{rows.length === LIMIT && " (더 있음)"}
          </span>
        )}
        <button onClick={() => setReload((n) => n + 1)}>새로고침</button>
      </div>
      <p className="muted">
        어드민에서 바꾼 가수·곡·앨범·문제·영어 사전이 자동으로 기록돼요.
        관리자가 비어 있으면 SQL Editor나 스크립트로 바꾼 거예요.
      </p>
      {error && (
        <p className="form-error">
          {error} (audit_log 마이그레이션을 실행했는지 확인하세요.)
        </p>
      )}
      {!rows && !error && <p>불러오는 중…</p>}
      {rows && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>시각</th>
                <th>관리자</th>
                <th>대상</th>
                <th>작업</th>
                <th>변경 내용</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{time(r.at)}</td>
                  <td>{r.actor ?? <span className="muted">(시스템)</span>}</td>
                  <td>
                    <span className="muted">
                      {tableLabel.get(r.table_name) ?? r.table_name}
                    </span>
                    <br />
                    <button
                      className="link mono"
                      onClick={() => setKey(r.row_key)}
                    >
                      {r.row_key}
                    </button>
                  </td>
                  <td>{ACTION_LABELS[r.action]}</td>
                  <td>
                    <ul className="audit-changes">
                      {auditChanges(r.before, r.after).map((c) => (
                        <li key={c.field}>
                          <b>{c.field}</b>{" "}
                          {r.action === "update" ? (
                            <>
                              <del>{c.before || "(없음)"}</del> →{" "}
                              <ins>{c.after || "(없음)"}</ins>
                            </>
                          ) : (
                            c.after || c.before
                          )}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="muted">기록이 없어요.</p>}
        </div>
      )}
    </section>
  );
}
