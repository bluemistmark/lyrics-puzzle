import { useState } from "react";
import type { Catalog, Issue } from "../data/build-catalog.ts";
import { supabase } from "./supabase";

const SHOWN = 100;

type State = { kind: "idle" | "sending" | "done" | "error"; message?: string };

export function PublishTab({
  catalog,
  issues,
}: {
  catalog: Catalog;
  issues: Issue[];
}) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const publish = async () => {
    if (!confirm("지금 데이터로 사이트를 다시 빌드할까요?")) return;
    setState({ kind: "sending" });
    try {
      const { data } = await supabase!.auth.getSession();
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${data.session?.access_token ?? ""}`,
        },
      });
      if (response.status === 404)
        throw Error(
          "게시 API를 찾을 수 없어요. 로컬 vite 서버에서는 게시할 수 없고, 배포된 사이트(또는 vercel dev)에서 사용하세요.",
        );
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw Error(body.error ?? `게시 실패 (${response.status})`);
      setState({
        kind: "done",
        message:
          "배포를 시작했어요. 보통 1~2분 뒤 반영돼요. 빌드 중 검증이나 테스트가 실패하면 기존 버전이 그대로 유지되니 Vercel 대시보드에서 확인하세요.",
      });
    } catch (error) {
      setState({ kind: "error", message: (error as Error).message });
    }
  };

  return (
    <section className="publish">
      <div className="stats">
        <div>
          <span>게시될 곡</span>
          <strong>{catalog.songs.length}</strong>
        </div>
        <div>
          <span>게시될 문제</span>
          <strong>{catalog.questions.length}</strong>
        </div>
        <div>
          <span>영어 사전</span>
          <strong>{catalog.dictionary.length}</strong>
        </div>
      </div>
      <p className="muted">
        어드민에서 저장한 내용은 바로 DB에 들어가지만, 게임에는 게시해야
        반영돼요. 사용 중인 문제가 하나라도 있는 곡만 게임에 나와요.
      </p>
      {issues.length > 0 ? (
        <div className="notice">
          <b>게시 전에 고쳐야 할 문제 {issues.length}건</b>
          <ul>
            {issues.slice(0, SHOWN).map((issue, i) => (
              <li key={i}>{issue.message}</li>
            ))}
          </ul>
          {issues.length > SHOWN && <p>외 {issues.length - SHOWN}건</p>}
        </div>
      ) : (
        <p className="ok-text">검증 통과. 게시할 수 있어요.</p>
      )}
      <button
        className="primary"
        disabled={issues.length > 0 || state.kind === "sending"}
        onClick={publish}
      >
        {state.kind === "sending" ? "요청 중…" : "게시하기"}
      </button>
      {state.message && (
        <p
          className={state.kind === "error" ? "form-error" : "ok-text"}
          role="status"
        >
          {state.message}
        </p>
      )}
    </section>
  );
}
