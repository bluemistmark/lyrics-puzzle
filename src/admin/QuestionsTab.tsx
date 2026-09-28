import { useMemo, useState } from "react";
import {
  compareSongs,
  sortArtists,
  type Issue,
  type QuestionRow,
  type SongRow,
} from "../data/build-catalog.ts";
import { scanLine, sortDictionary } from "../data/english.ts";
import { FormDialog } from "./FormDialog";
import { nextQuestionId } from "./ids";
import { useAdmin } from "./store";

export function QuestionsTab({ issues }: { issues: Issue[] }) {
  const questions = useAdmin((s) => s.questions);
  const artistRows = useAdmin((s) => s.artists);
  const songs = useAdmin((s) => s.songs);
  const saveQuestion = useAdmin((s) => s.saveQuestion);
  const removeQuestion = useAdmin((s) => s.removeQuestion);
  const [artist, setArtist] = useState("");
  const [songId, setSongId] = useState("");
  const [query, setQuery] = useState("");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [editing, setEditing] = useState<QuestionRow | "new" | null>(null);

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

  const toggle = async (row: QuestionRow) => {
    try {
      await saveQuestion({ ...row, active: !row.active }, false);
    } catch (error) {
      alert((error as Error).message);
    }
  };
  const remove = async (row: QuestionRow) => {
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
        <button
          className="primary"
          onClick={() => setEditing("new")}
          disabled={!songs.length}
        >
          문제 추가
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
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
    </section>
  );
}

function QuestionForm({
  question,
  defaultSongId,
  onClose,
}: {
  question: QuestionRow | null;
  defaultSongId: string;
  onClose: () => void;
}) {
  const questions = useAdmin((s) => s.questions);
  const artists = useAdmin((s) => s.artists);
  const songs = useAdmin((s) => s.songs);
  const dictionary = useAdmin((s) => s.dictionary);
  const saveQuestion = useAdmin((s) => s.saveQuestion);
  const isNew = !question;
  const [id, setId] = useState(() => question?.id ?? nextQuestionId(questions));
  const [songId, setSongId] = useState(question?.song_id ?? defaultSongId);
  const [lines, setLines] = useState(() =>
    [0, 1, 2].map((i) => question?.lines[i] ?? ""),
  );
  const [active, setActive] = useState(question?.active ?? true);
  const sorted = useMemo(() => sortDictionary(dictionary), [dictionary]);
  const missing = useMemo(
    () => [
      ...new Set(
        lines.flatMap((line) => scanLine(line.trim(), sorted).missing),
      ),
    ],
    [lines, sorted],
  );
  const grouped = useMemo(() => {
    const map = new Map<string, SongRow[]>();
    for (const s of [...songs].sort(compareSongs(artists)))
      map.set(s.artist, [...(map.get(s.artist) ?? []), s]);
    return [...map];
  }, [songs, artists]);

  return (
    <FormDialog
      title={isNew ? "문제 추가" : `문제 ${question.id} 수정`}
      onClose={onClose}
      onSubmit={async () => {
        const trimmed = lines.map((l) => l.trim());
        if (!id.trim() || !songId) throw Error("문제ID와 곡을 선택하세요.");
        if (!trimmed[0] || !trimmed[1]) throw Error("가사1·가사2는 필수예요.");
        await saveQuestion(
          {
            id: id.trim(),
            song_id: songId,
            lines: trimmed.filter(Boolean),
            active,
          },
          isNew,
        );
      }}
    >
      <label>
        곡
        <select
          value={songId}
          onChange={(e) => setSongId(e.target.value)}
          required
        >
          <option value="">곡 선택</option>
          {grouped.map(([artist, list]) => (
            <optgroup key={artist} label={artist}>
              {list.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label>
        문제ID
        <input
          className="mono"
          value={id}
          onChange={(e) => setId(e.target.value)}
          disabled={!isNew}
          required
        />
        {!isNew && <small>문제ID는 바꿀 수 없어요.</small>}
      </label>
      {lines.map((line, i) => (
        <label key={i}>
          가사{i + 1}
          {i === 2 && <span className="muted"> (선택)</span>}
          <input
            value={line}
            onChange={(e) =>
              setLines(lines.map((l, j) => (j === i ? e.target.value : l)))
            }
            required={i < 2}
          />
        </label>
      ))}
      <label className="check">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        출제에 사용
      </label>
      {missing.length > 0 && (
        <div className="notice">
          <b>영어 사전에 없는 단어</b>
          <p>발음을 등록해야 게시할 수 있어요. 저장은 먼저 해도 됩니다.</p>
          {missing.map((word) => (
            <QuickAddWord key={word} word={word} />
          ))}
        </div>
      )}
    </FormDialog>
  );
}

function QuickAddWord({ word }: { word: string }) {
  const saveEntry = useAdmin((s) => s.saveEntry);
  const [pronunciation, setPronunciation] = useState("");
  const [error, setError] = useState("");
  const add = async () => {
    if (!pronunciation.trim()) return setError("표시발음을 입력하세요.");
    try {
      await saveEntry(
        {
          english: word,
          pronunciation: pronunciation.trim(),
          alternatives: [],
        },
        true,
      );
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <div className="quick-add">
      <span className="mono">{word}</span>
      <input
        placeholder="표시발음 (예: 예)"
        value={pronunciation}
        onChange={(e) => setPronunciation(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            add();
          }
        }}
      />
      <button type="button" onClick={add}>
        사전에 추가
      </button>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
