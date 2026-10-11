import { useMemo, useState } from "react";
import {
  compareSongs,
  sortArtists,
  type Issue,
  type QuestionRow,
} from "../data/build-catalog.ts";
import { BulkQuestionForm } from "./BulkQuestionForm";
import { CsvButton } from "./CsvButton";
import { DeleteQuestionDialog } from "./DeleteQuestionDialog";
import { QuestionForm } from "./QuestionForm";
import { useAdmin } from "./store";
import { useRoute, useRouteParam } from "./useRoute";

export function QuestionsTab({ issues }: { issues: Issue[] }) {
  const questions = useAdmin((s) => s.questions);
  const artistRows = useAdmin((s) => s.artists);
  const songs = useAdmin((s) => s.songs);
  const saveQuestion = useAdmin((s) => s.saveQuestion);
  const removeQuestion = useAdmin((s) => s.removeQuestion);
  const setQuestionsActive = useAdmin((s) => s.setQuestionsActive);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [artist, setArtist] = useRouteParam("artist");
  const [songId, setSongId] = useRouteParam("song");
  const [query, setQuery] = useRouteParam("q");
  const [issuesParam, setIssuesParam] = useRouteParam("issues");
  const onlyIssues = issuesParam === "1";
  const setOnlyIssues = (on: boolean) => setIssuesParam(on ? "1" : "");
  const [editing, setEditing] = useState<QuestionRow | "new" | null>(null);
  const [bulk, setBulk] = useState(false);
  const [deleting, setDeleting] = useState<QuestionRow | null>(null);
  const go = useRoute((s) => s.go);
  const releases = useAdmin((s) => s.releases);
  const published = useMemo(
    () => new Set(releases[0]?.question_ids ?? []),
    [releases],
  );

  const sortedSongs = useMemo(
    () => [...songs].sort(compareSongs(artistRows)),
    [songs, artistRows],
  );
  const songById = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs]);
  const artistNames = sortArtists(artistRows).map((a) => a.name);
  const issuesById = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const issue of issues)
      if (issue.questionId)
        map.set(issue.questionId, [
          ...(map.get(issue.questionId) ?? []),
          issue.message.replace(/^문제 \S+: /, ""),
        ]);
    return map;
  }, [issues]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...questions]
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .filter((row) => {
        const song = songById.get(row.song_id);
        if (artist && song?.artist !== artist) return false;
        if (songId && row.song_id !== songId) return false;
        if (onlyIssues && !issuesById.has(row.id)) return false;
        return (
          !q ||
          [row.id, song?.title ?? "", ...row.lines].some((v) =>
            v.toLowerCase().includes(q),
          )
        );
      });
  }, [questions, songById, artist, songId, onlyIssues, issuesById, query]);

  // Bulk actions apply to picked rows that the current filter still shows.
  const pickedVisible = visible.filter((row) => picked.has(row.id));
  const allPicked =
    visible.length > 0 && pickedVisible.length === visible.length;
  const pick = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const pickAll = () =>
    setPicked(allPicked ? new Set() : new Set(visible.map((row) => row.id)));
  const setActive = async (active: boolean) => {
    const ids = pickedVisible
      .filter((row) => row.active !== active)
      .map((row) => row.id);
    if (!ids.length) return;
    if (
      !confirm(
        `선택한 문제 ${ids.length}개를 ${active ? "출제에 사용" : "미사용"}으로 바꿀까요?`,
      )
    )
      return;
    setBusy(true);
    try {
      await setQuestionsActive(ids, active);
      setPicked(new Set());
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (row: QuestionRow) => {
    try {
      await saveQuestion({ ...row, active: !row.active }, false);
    } catch (error) {
      alert((error as Error).message);
    }
  };
  const remove = async (row: QuestionRow) => {
    if (published.has(row.id)) return setDeleting(row);
    if (!confirm(`문제 ${row.id}를 삭제할까요? 되돌릴 수 없어요.`)) return;
    try {
      await removeQuestion(row.id);
    } catch (error) {
      alert((error as Error).message);
    }
  };

  return (
    <section>
      <div className="toolbar">
        <select
          value={artist}
          onChange={(e) => {
            setArtist(e.target.value);
            setSongId("");
          }}
        >
          <option value="">전체 가수</option>
          {artistNames.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <select value={songId} onChange={(e) => setSongId(e.target.value)}>
          <option value="">전체 곡</option>
          {sortedSongs
            .filter((s) => !artist || s.artist === artist)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
        </select>
        <input
          type="search"
          placeholder="ID, 곡명, 가사 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={onlyIssues}
            onChange={(e) => setOnlyIssues(e.target.checked)}
          />
          오류만 ({issuesById.size})
        </label>
        <span className="admin-spacer" />
        <span className="muted">{visible.length}문제</span>
        <CsvButton
          kind="questions"
          rows={() => [
            [
              "문제ID",
              "가수",
              "곡ID",
              "곡명",
              "가사1",
              "가사2",
              "가사3",
              "출제 사용",
            ],
            ...visible.map((q) => {
              const song = songById.get(q.song_id);
              return [
                q.id,
                song?.artist,
                q.song_id,
                song?.title,
                q.lines[0],
                q.lines[1],
                q.lines[2],
                q.active,
              ];
            }),
          ]}
        />
        <button onClick={() => setBulk(true)} disabled={!songs.length}>
          여러 문제 추가
        </button>
        <button
          className="primary"
          onClick={() => setEditing("new")}
          disabled={!songs.length}
        >
          문제 추가
        </button>
      </div>
      {pickedVisible.length > 0 && (
        <div className="toolbar selection-bar">
          <b>{pickedVisible.length}개 선택</b>
          <button disabled={busy} onClick={() => setActive(true)}>
            출제에 사용
          </button>
          <button disabled={busy} onClick={() => setActive(false)}>
            미사용
          </button>
          <button disabled={busy} onClick={() => setPicked(new Set())}>
            선택 해제
          </button>
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label="보이는 문제 모두 선택"
                  checked={allPicked}
                  onChange={pickAll}
                />
              </th>
              <th>문제ID</th>
              <th>곡</th>
              <th>가사</th>
              <th>사용</th>
              <th>상태</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const song = songById.get(row.song_id);
              const problems = issuesById.get(row.id);
              return (
                <tr key={row.id} className={row.active ? "" : "inactive"}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`${row.id} 선택`}
                      checked={picked.has(row.id)}
                      onChange={() => pick(row.id)}
                    />
                  </td>
                  <td className="mono">{row.id}</td>
                  <td>
                    <span className="muted">{song?.artist}</span>
                    <br />
                    {song?.title ?? row.song_id}
                  </td>
                  <td className="lyrics-cell">
                    {row.lines.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      aria-label="출제 사용"
                      checked={row.active}
                      onChange={() => toggle(row)}
                    />
                  </td>
                  <td>
                    {problems ? (
                      problems.map((p) => (
                        <div key={p} className="warn-text">
                          {p}
                        </div>
                      ))
                    ) : (
                      <span className="muted">정상</span>
                    )}
                  </td>
                  <td className="row-actions">
                    <button onClick={() => setEditing(row)}>수정</button>
                    <button
                      onClick={() =>
                        go("history", { table: "questions", q: row.id })
                      }
                    >
                      이력
                    </button>
                    <button className="danger" onClick={() => remove(row)}>
                      삭제
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing && (
        <QuestionForm
          question={editing === "new" ? null : editing}
          defaultSongId={songId}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <DeleteQuestionDialog
          question={deleting}
          onClose={() => setDeleting(null)}
        />
      )}
      {bulk && (
        <BulkQuestionForm
          defaultSongId={songId}
          onClose={() => setBulk(false)}
        />
      )}
    </section>
  );
}
