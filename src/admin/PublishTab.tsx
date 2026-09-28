import { useMemo, useState } from "react";
import type { Catalog, Issue } from "../data/build-catalog.ts";
import {
  draftRelease,
  hasNews,
  type ReleaseDraft,
  type ReleaseRow,
} from "../data/releases.ts";
import { useAdmin } from "./store";
import { supabase } from "./supabase";

const SHOWN = 100;
const SONGS_SHOWN = 20;

type State = { kind: "idle" | "sending" | "done" | "error"; message?: string };

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  });

export function PublishTab({
  catalog,
  issues,
}: {
  catalog: Catalog;
  issues: Issue[];
}) {
  const releases = useAdmin((s) => s.releases);
  const releasesError = useAdmin((s) => s.releasesError);
  const addRelease = useAdmin((s) => s.addRelease);
  const [features, setFeatures] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const previous = releases[0];
  const draft = useMemo(
    () => draftRelease(catalog, previous, features, note),
    [catalog, previous, features, note],
  );

  const publish = async () => {
    if (!confirm("지금 데이터로 사이트를 다시 빌드할까요?")) return;
    setState({ kind: "sending" });
    try {
      const { data } = await supabase!.auth.getSession();
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${data.session?.access_token ?? ""}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ release: draft }),
      });
      if (response.status === 404)
        throw Error(
          "게시 API를 찾을 수 없어요. 로컬 vite 서버에서는 게시할 수 없고, 배포된 사이트(또는 vercel dev)에서 사용하세요.",
        );
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        release?: ReleaseRow | null;
      };
      if (!response.ok)
        throw Error(body.error ?? `게시 실패 (${response.status})`);
      if (body.release) addRelease(body.release);
      setFeatures("");
      setNote("");
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

      <h2 className="section-title">게임 소식</h2>
      {releasesError && (
        <p className="form-error">
          게시 기록을 읽지 못했어요: {releasesError} (releases 마이그레이션을
          실행했는지 확인하세요)
        </p>
      )}
      <label className="stack">
        새 기능 <span className="muted">(한 줄에 하나, 선택)</span>
        <textarea
          rows={3}
          value={features}
          onChange={(e) => setFeatures(e.target.value)}
          placeholder={
            "소식 탭이 생겼어요\n여러 문제를 한 번에 추가할 수 있어요"
          }
        />
      </label>
      <label className="stack">
        메모 <span className="muted">(선택)</span>
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="예: 다음 주에는 도영 솔로 곡이 추가돼요!"
        />
      </label>
      <NewsPreview draft={draft} baseline={!previous} />

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

      <ReleaseHistory />
    </section>
  );
}

function NewsPreview({
  draft,
  baseline,
}: {
  draft: ReleaseDraft;
  baseline: boolean;
}) {
  const songs = draft.added_songs;
  return (
    <div className="news-preview">
      <b>소식 미리보기</b>
      {baseline && (
        <p className="muted">
          첫 게시는 기준점으로 기록돼요. 새 곡·문제 목록은 다음 게시부터
          자동으로 나와요.
        </p>
      )}
      {draft.features.length > 0 && (
        <ul>
          {draft.features.map((f, i) => (
            <li key={i}>✨ {f}</li>
          ))}
        </ul>
      )}
      {songs.length > 0 && (
        <p>
          새 곡 {songs.length}곡:{" "}
          {songs
            .slice(0, SONGS_SHOWN)
            .map((s) => `${s.title} (${s.artist})`)
            .join(", ")}
          {songs.length > SONGS_SHOWN && ` 외 ${songs.length - SONGS_SHOWN}곡`}
        </p>
      )}
      {(draft.added_questions > 0 || draft.removed_questions > 0) && (
        <p>
          문제 {draft.added_questions}개 추가
          {draft.removed_questions > 0 &&
            ` · ${draft.removed_questions}개 정리`}
        </p>
      )}
      {draft.note && <p className="pre-line">{draft.note}</p>}
      {!hasNews(draft) && (
        <p className="muted">
          바뀐 내용이 없어서 이번 게시는 게임 소식에 나오지 않아요.
        </p>
      )}
    </div>
  );
}

function ReleaseHistory() {
  const releases = useAdmin((s) => s.releases);
  const removeRelease = useAdmin((s) => s.removeRelease);
  if (!releases.length) return null;
  const remove = async (r: ReleaseRow) => {
    if (
      !confirm(
        "이 게시 기록을 삭제할까요? 다음 게시부터 게임 소식에서 사라지고, 다음 게시의 '새 곡·문제'는 그 이전 기록과 비교해 계산돼요.",
      )
    )
      return;
    try {
      await removeRelease(r.id);
    } catch (error) {
      alert((error as Error).message);
    }
  };
  return (
    <>
      <h2 className="section-title">최근 게시 기록</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>게시 시각</th>
              <th>내용</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {releases.map((r) => (
              <tr key={r.id}>
                <td>{formatDate(r.created_at)}</td>
                <td>
                  {r.features.map((f, i) => (
                    <div key={i}>✨ {f}</div>
                  ))}
                  {r.added_songs.length > 0 && (
                    <div>새 곡 {r.added_songs.length}곡</div>
                  )}
                  {(r.added_questions > 0 || r.removed_questions > 0) && (
                    <div>
                      문제 +{r.added_questions} / -{r.removed_questions}
                    </div>
                  )}
                  {r.note && <div className="pre-line">{r.note}</div>}
                  {!hasNews(r) && (
                    <span className="muted">기준점 (게임 소식에 안 보임)</span>
                  )}
                </td>
                <td className="row-actions">
                  <button className="danger" onClick={() => remove(r)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
