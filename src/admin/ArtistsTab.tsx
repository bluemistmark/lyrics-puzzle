import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  isPrefix,
  sortArtists,
  type ArtistRow,
} from "../data/build-catalog.ts";
import { CsvButton } from "./CsvButton";
import { FormDialog } from "./FormDialog";
import { nextSongId } from "./ids";
import { useAdmin } from "./store";

export function ArtistsTab() {
  const artists = useAdmin((s) => s.artists);
  const songs = useAdmin((s) => s.songs);
  const removeArtist = useAdmin((s) => s.removeArtist);
  const moveArtist = useAdmin((s) => s.moveArtist);
  const [editing, setEditing] = useState<ArtistRow | "new" | null>(null);
  const [busy, setBusy] = useState(false);

  const ordered = useMemo(() => sortArtists(artists), [artists]);
  const songCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of songs) map.set(s.artist, (map.get(s.artist) ?? 0) + 1);
    return map;
  }, [songs]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = (artist: ArtistRow) => {
    if (!confirm(`가수 "${artist.name}"를 삭제할까요?`)) return;
    run(() => removeArtist(artist.name));
  };

  return (
    <section>
      <div className="toolbar">
        <span className="muted">
          이 순서가 게임의 유닛 표시 순서예요. NCT 유닛이 아닌 가수는 게임에서
          &quot;다른 가수&quot;로 따로 보이고 데일리 퀴즈에 나오지 않아요. 곡이
          없는 가수만 삭제할 수 있어요.
        </span>
        <span className="admin-spacer" />
        <CsvButton
          kind="artists"
          rows={() => [
            ["순서", "가수명", "영문 이름", "NCT 유닛", "접두어", "곡 수"],
            ...ordered.map((a, i) => [
              i + 1,
              a.name,
              a.english_name ?? "",
              a.main,
              a.prefix,
              songCounts.get(a.name) ?? 0,
            ]),
          ]}
        />
        <button className="primary" onClick={() => setEditing("new")}>
          가수 추가
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>순서</th>
              <th>가수명</th>
              <th>영문 이름</th>
              <th>구분</th>
              <th>접두어</th>
              <th>곡 수</th>
              <th>다음 곡ID</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {ordered.map((a, i) => {
              const count = songCounts.get(a.name) ?? 0;
              return (
                <tr key={a.name}>
                  <td className="row-actions order-cell">
                    <button
                      aria-label={`${a.name} 위로`}
                      disabled={busy || i === 0}
                      onClick={() => run(() => moveArtist(a.name, -1))}
                    >
                      <ChevronUp size={14} aria-hidden="true" />
                    </button>
                    <button
                      aria-label={`${a.name} 아래로`}
                      disabled={busy || i === ordered.length - 1}
                      onClick={() => run(() => moveArtist(a.name, 1))}
                    >
                      <ChevronDown size={14} aria-hidden="true" />
                    </button>
                  </td>
                  <td>{a.name}</td>
                  <td className="muted">{a.english_name}</td>
                  <td>
                    {a.main ? (
                      <span className="badge">NCT</span>
                    ) : (
                      <span className="muted">다른 가수</span>
                    )}
                  </td>
                  <td className="mono">{a.prefix}</td>
                  <td>{count}</td>
                  <td className="mono muted">{nextSongId(songs, a.prefix)}</td>
                  <td className="row-actions">
                    <button onClick={() => setEditing(a)}>수정</button>
                    <button
                      className="danger"
                      disabled={busy || count > 0}
                      title={
                        count
                          ? "곡을 먼저 삭제하거나 다른 가수로 옮기세요."
                          : undefined
                      }
                      onClick={() => remove(a)}
                    >
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
        <ArtistForm
          artist={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function ArtistForm({
  artist,
  onClose,
}: {
  artist: ArtistRow | null;
  onClose: () => void;
}) {
  const artists = useAdmin((s) => s.artists);
  const songs = useAdmin((s) => s.songs);
  const saveArtist = useAdmin((s) => s.saveArtist);
  const [name, setName] = useState(artist?.name ?? "");
  const [prefix, setPrefix] = useState(artist?.prefix ?? "");
  const [main, setMain] = useState(artist?.main ?? false);
  const [english, setEnglish] = useState(artist?.english_name ?? "");
  const songCount = artist
    ? songs.filter((s) => s.artist === artist.name).length
    : 0;
  const renaming = artist !== null && name.trim() !== artist.name;
  const others = artists.filter((a) => a.name !== artist?.name);

  return (
    <FormDialog
      title={artist ? "가수 수정" : "가수 추가"}
      onClose={onClose}
      onSubmit={async () => {
        const trimmed = name.trim();
        const code = prefix.trim();
        if (!trimmed) throw Error("가수명을 입력하세요.");
        if (!isPrefix(code)) throw Error("접두어는 영문·숫자만 쓸 수 있어요.");
        if (others.some((a) => a.name === trimmed))
          throw Error("이미 있는 가수명이에요.");
        const owner = others.find((a) => a.prefix === code);
        if (owner)
          throw Error(`접두어 ${code}는 ${owner.name}이(가) 쓰고 있어요.`);
        if (
          renaming &&
          songCount &&
          !confirm(
            `가수명을 바꾸면 곡 ${songCount}개의 가수도 함께 바뀌고, 게시 후 게임의 유닛 이름도 바뀌어요. 계속할까요?`,
          )
        )
          throw Error("취소했어요.");
        await saveArtist(
          {
            name: trimmed,
            prefix: code,
            main,
            english_name: english.trim(),
            sort_order:
              artist?.sort_order ??
              Math.max(-1, ...artists.map((a) => a.sort_order)) + 1,
          },
          artist?.name ?? null,
        );
      }}
    >
      <label>
        가수명
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <small>게임에서 유닛 이름으로 표시돼요.</small>
      </label>
      <label>
        영문 이름 <span className="muted">(선택)</span>
        <input
          value={english}
          onChange={(e) => setEnglish(e.target.value)}
          placeholder="예: DOYOUNG"
        />
        <small>
          Deezer·iTunes가 영문으로 올린 가수(도영 → DOYOUNG)의 앨범·앨범아트를
          찾을 때 써요. 바꾸면 못 찾은 커버를 다음 게시 때 다시 찾아요.
        </small>
      </label>
      <label>
        곡ID 접두어
        <input
          className="mono"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          placeholder="예: D"
          required
        />
        <small>
          새 곡을 추가할 때 {nextSongId(songs, prefix.trim()) || "D_001"} 같은
          ID를 제안해요.
          {artist && " 바꿔도 기존 곡ID는 그대로예요."}
        </small>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={main}
          onChange={(e) => setMain(e.target.checked)}
        />
        NCT 유닛
      </label>
      <small className="muted">
        NCT 유닛은 게임의 기본 선택 범위와 데일리 퀴즈에 포함돼요. 체크하지
        않으면 &quot;다른 가수&quot;로 따로 표시되고, 플레이어가 직접 골라야
        나와요.
      </small>
    </FormDialog>
  );
}
