import { useMemo, useState } from "react";
import type { SongRow } from "../data/build-catalog.ts";
import { FormDialog } from "./FormDialog";
import { joinList, nextSongId, splitList } from "./ids";
import { useAdmin } from "./store";

const includes = (value: string, query: string) =>
  value.toLowerCase().includes(query.trim().toLowerCase());

export function SongsTab() {
  const songs = useAdmin((s) => s.songs);
  const questions = useAdmin((s) => s.questions);
  const removeSong = useAdmin((s) => s.removeSong);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<SongRow | "new" | null>(null);

  const counts = useMemo(() => {
    const map = new Map<string, { total: number; active: number }>();
    for (const q of questions) {
      const c = map.get(q.song_id) ?? { total: 0, active: 0 };
      c.total++;
      if (q.active) c.active++;
      map.set(q.song_id, c);
    }
    return map;
  }, [questions]);
  const visible = useMemo(
    () =>
      [...songs]
        .sort((a, b) => a.sort_order - b.sort_order || (a.id < b.id ? -1 : 1))
        .filter((s) =>
          [s.id, s.artist, s.title, ...s.aliases].some((v) =>
            includes(v, query),
          ),
        ),
    [songs, query],
  );

  const remove = async (song: SongRow) => {
    const n = counts.get(song.id)?.total ?? 0;
    const message = n
      ? `"${song.title}" 곡과 이 곡의 문제 ${n}개를 삭제할까요? 되돌릴 수 없어요.`
      : `"${song.title}" 곡을 삭제할까요?`;
    if (!confirm(message)) return;
    try {
      await removeSong(song.id);
    } catch (error) {
      alert((error as Error).message);
    }
  };

  return (
    <section>
      <div className="toolbar">
        <input
          type="search"
          placeholder="ID, 가수, 곡명, 별칭 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="admin-spacer" />
        <span className="muted">{visible.length}곡</span>
        <button className="primary" onClick={() => setEditing("new")}>
          곡 추가
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>곡ID</th>
              <th>가수</th>
              <th>곡명</th>
              <th>정답 별칭</th>
              <th>문제(사용/전체)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => {
              const c = counts.get(s.id);
              return (
                <tr key={s.id}>
                  <td className="mono">{s.id}</td>
                  <td>{s.artist}</td>
                  <td>{s.title}</td>
                  <td>{joinList(s.aliases)}</td>
                  <td className={c?.active ? "" : "warn-text"}>
                    {c?.active ?? 0}/{c?.total ?? 0}
                  </td>
                  <td className="row-actions">
                    <button onClick={() => setEditing(s)}>수정</button>
                    <button className="danger" onClick={() => remove(s)}>
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
        <SongForm
          song={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function SongForm({
  song,
  onClose,
}: {
  song: SongRow | null;
  onClose: () => void;
}) {
  const songs = useAdmin((s) => s.songs);
  const saveSong = useAdmin((s) => s.saveSong);
  const isNew = !song;
  const [artist, setArtist] = useState(song?.artist ?? "");
  const [title, setTitle] = useState(song?.title ?? "");
  const [aliases, setAliases] = useState(joinList(song?.aliases ?? []));
  const [id, setId] = useState<string>();
  // Until the id is typed by hand, suggest the next one for the chosen artist.
  const shownId = song?.id ?? id ?? nextSongId(songs, artist);
  const artists = [...new Set(songs.map((s) => s.artist))];

  return (
    <FormDialog
      title={isNew ? "곡 추가" : "곡 수정"}
      onClose={onClose}
      onSubmit={async () => {
        if (!shownId.trim() || !artist.trim() || !title.trim())
          throw Error("곡ID, 가수명, 곡명은 필수예요.");
        await saveSong(
          {
            id: shownId.trim(),
            artist: artist.trim(),
            title: title.trim(),
            aliases: splitList(aliases),
            sort_order:
              song?.sort_order ??
              Math.max(-1, ...songs.map((s) => s.sort_order)) + 1,
          },
          isNew,
        );
      }}
    >
      <label>
        가수명
        <input
          list="artists"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          required
        />
        <datalist id="artists">
          {artists.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </label>
      <label>
        곡명
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <small>괄호 안 제목과 괄호를 뺀 제목도 정답으로 인정돼요.</small>
      </label>
      <label>
        곡ID
        <input
          className="mono"
          value={shownId}
          onChange={(e) => setId(e.target.value)}
          disabled={!isNew}
          required
        />
        <small>
          {isNew
            ? "저장 후에는 바꿀 수 없어요. 새 가수라면 직접 입력하세요 (예: W_001)."
            : "곡ID는 바꿀 수 없어요."}
        </small>
      </label>
      <label>
        정답 별칭
        <input value={aliases} onChange={(e) => setAliases(e.target.value)} />
        <small>여러 개는 | 로 구분해요.</small>
      </label>
    </FormDialog>
  );
}
