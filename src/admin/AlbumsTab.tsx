import { useMemo, useState } from "react";
import { KIND_LABELS } from "../data/albums.ts";
import {
  sortArtists,
  type AlbumKind,
  type AlbumRow,
} from "../data/build-catalog.ts";
import { Cover } from "./Cover";
import { CsvButton } from "./CsvButton";
import { FormDialog } from "./FormDialog";
import { SortHeader, useSortParam } from "./SortHeader";
import { useAdmin } from "./store";
import { byCode, byText, matchesQuery, shortTime, sortRows } from "./table.ts";
import { useRoute, useRouteParam } from "./useRoute";

const SORT_KEYS = ["released", "title", "artist", "songs", "updated"] as const;
const KINDS: AlbumKind[] = ["album", "ep", "single", "compile", ""];
/** An album of several artists' songs (artist null). */
const SEVERAL = "여러 가수";

/** 앨범: what songs are grouped by. Filled by 자동 채우기 in the 곡 tab, corrected here. */
export function AlbumsTab() {
  const albums = useAdmin((s) => s.albums);
  const artists = useAdmin((s) => s.artists);
  const songs = useAdmin((s) => s.songs);
  const removeAlbum = useAdmin((s) => s.removeAlbum);
  const go = useRoute((s) => s.go);
  const clearParams = useRoute((s) => s.clearParams);
  const [query, setQuery] = useRouteParam("q");
  /** An artist's name, or "none" for albums of several artists. */
  const [artist, setArtist] = useRouteParam("artist");
  const [kind, setKind] = useRouteParam("kind");
  const [sort, setSort] = useSortParam(SORT_KEYS, {
    key: "released",
    desc: true,
  });
  const [editing, setEditing] = useState<AlbumRow | "new" | null>(null);
  const filtered = Boolean(query || kind || artist);
  const ordered = useMemo(() => sortArtists(artists), [artists]);

  const tracks = useMemo(() => {
    const map = new Map<number, { count: number; titles: string[] }>();
    for (const s of songs) {
      if (s.album_id == null) continue;
      const t = map.get(s.album_id) ?? { count: 0, titles: [] };
      t.count++;
      if (s.title_track) t.titles.push(s.title);
      map.set(s.album_id, t);
    }
    return map;
  }, [songs]);
  const count = (a: AlbumRow) => tracks.get(a.id)?.count ?? 0;
  const visible = useMemo(() => {
    const count = (a: AlbumRow) => tracks.get(a.id)?.count ?? 0;
    // Artists in their tab's order; albums of several artists last.
    const rank = (a: AlbumRow) => {
      const i = ordered.findIndex((r) => r.name === a.artist);
      return i < 0 ? ordered.length : i;
    };
    const rows = albums.filter(
      (a) =>
        (!kind || a.kind === (kind === "none" ? "" : kind)) &&
        (!artist || a.artist === (artist === "none" ? null : artist)) &&
        matchesQuery([a.title, a.artist ?? SEVERAL, String(a.id)], query),
    );
    const compare = {
      // Albums without a date come last either way.
      released: (a: AlbumRow, b: AlbumRow) =>
        (Number(!a.released_on) - Number(!b.released_on)) *
          (sort.desc ? -1 : 1) ||
        byCode(a.released_on ?? "", b.released_on ?? "") ||
        byText(a.title, b.title),
      title: (a: AlbumRow, b: AlbumRow) => byText(a.title, b.title),
      artist: (a: AlbumRow, b: AlbumRow) => rank(a) - rank(b),
      songs: (a: AlbumRow, b: AlbumRow) => count(a) - count(b),
      updated: (a: AlbumRow, b: AlbumRow) =>
        byCode(a.updated_at ?? "", b.updated_at ?? ""),
    }[sort.key];
    return sortRows(rows, compare, sort.desc);
  }, [albums, ordered, kind, artist, query, sort, tracks]);

  const remove = async (album: AlbumRow) => {
    const n = count(album);
    if (
      !confirm(
        n
          ? `"${album.title}" 앨범을 삭제할까요? 수록곡 ${n}곡은 앨범이 비워져요.`
          : `"${album.title}" 앨범을 삭제할까요?`,
      )
    )
      return;
    try {
      await removeAlbum(album.id);
    } catch (error) {
      alert((error as Error).message);
    }
  };

  return (
    <section>
      <div className="toolbar">
        <select
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          aria-label="가수"
        >
          <option value="">전체 가수</option>
          {ordered.map((a) => (
            <option key={a.name}>{a.name}</option>
          ))}
          <option value="none">{SEVERAL}</option>
        </select>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          aria-label="종류"
        >
          <option value="">전체 종류</option>
          {KINDS.map((k) => (
            <option key={k} value={k || "none"}>
              {KIND_LABELS[k] || "종류 없음"}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="앨범명, 가수, 초성 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {filtered && (
          <button onClick={() => clearParams(["sort"])}>필터 초기화</button>
        )}
        <span className="admin-spacer" />
        <span className="muted">
          {filtered
            ? `${visible.length} / ${albums.length}개`
            : `${albums.length}개`}
        </span>
        <CsvButton
          kind="albums"
          rows={() => [
            [
              "앨범ID",
              "앨범명",
              "가수",
              "종류",
              "발매일",
              "수록곡",
              "타이틀곡",
            ],
            ...visible.map((a) => [
              a.id,
              a.title,
              a.artist ?? SEVERAL,
              KIND_LABELS[a.kind],
              a.released_on ?? "",
              count(a),
              tracks.get(a.id)?.titles ?? [],
            ]),
          ]}
        />
        <button className="primary" onClick={() => setEditing("new")}>
          앨범 추가
        </button>
      </div>
      <p className="muted">
        곡 탭의 "앨범 자동 채우기"가 Deezer·iTunes에서 찾아 만들어요. 앨범
        정보는 어드민에서만 쓰고, 커버는 곡에 앨범아트가 따로 없을 때 게임
        앨범아트로 쓰여요.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th aria-label="커버" />
              <SortHeader
                label="앨범명"
                sortKey="title"
                sort={sort}
                onSort={setSort}
              />
              <SortHeader
                label="가수"
                sortKey="artist"
                sort={sort}
                onSort={setSort}
              />
              <th>종류</th>
              <SortHeader
                label="발매일"
                sortKey="released"
                sort={sort}
                onSort={setSort}
                firstDesc
              />
              <SortHeader
                label="수록곡"
                sortKey="songs"
                sort={sort}
                onSort={setSort}
                firstDesc
              />
              <th>타이틀곡</th>
              <SortHeader
                label="수정"
                sortKey="updated"
                sort={sort}
                onSort={setSort}
                firstDesc
              />
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((a) => (
              <tr key={a.id}>
                <td>
                  <Cover url={a.cover_url} />
                </td>
                <td>{a.title}</td>
                <td>{a.artist ?? <span className="muted">{SEVERAL}</span>}</td>
                <td className="nowrap">{KIND_LABELS[a.kind]}</td>
                <td className="nowrap">{a.released_on}</td>
                <td>
                  <button
                    className={count(a) ? "link" : "link warn-text"}
                    title="이 앨범의 곡 보기"
                    onClick={() => go("songs", { album: String(a.id) })}
                  >
                    {count(a)}
                  </button>
                </td>
                <td>{tracks.get(a.id)?.titles.join(", ")}</td>
                <td className="muted nowrap">
                  {a.updated_at && shortTime(a.updated_at)}
                </td>
                <td className="row-actions">
                  <button onClick={() => setEditing(a)}>수정</button>
                  <button className="danger" onClick={() => remove(a)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && <p className="muted">앨범이 없어요.</p>}
      </div>
      {editing && (
        <AlbumForm
          album={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function AlbumForm({
  album,
  onClose,
}: {
  album: AlbumRow | null;
  onClose: () => void;
}) {
  const saveAlbum = useAdmin((s) => s.saveAlbum);
  const artists = useAdmin((s) => s.artists);
  const [title, setTitle] = useState(album?.title ?? "");
  const [artist, setArtist] = useState(album?.artist ?? "");
  const [kind, setKind] = useState<AlbumKind>(album?.kind ?? "");
  const [releasedOn, setReleasedOn] = useState(album?.released_on ?? "");
  const [cover, setCover] = useState(album?.cover_url ?? "");

  return (
    <FormDialog
      title={album ? "앨범 수정" : "앨범 추가"}
      onClose={onClose}
      onSubmit={async () => {
        if (!title.trim()) throw Error("앨범명은 필수예요.");
        await saveAlbum({
          ...(album ?? { external_id: "" }),
          title: title.trim(),
          artist: artist || null,
          kind,
          released_on: releasedOn || null,
          cover_url: cover.trim(),
        });
      }}
    >
      <label>
        앨범명
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>
      <label>
        가수
        <select value={artist} onChange={(e) => setArtist(e.target.value)}>
          {sortArtists(artists).map((a) => (
            <option key={a.name}>{a.name}</option>
          ))}
          <option value="">{SEVERAL}</option>
        </select>
        <small>
          NCT 2020·SMTOWN처럼 여러 가수의 곡이 든 앨범은 {SEVERAL}로 둬요. 곡을
          고를 때 그 가수 앨범만 보여요.
        </small>
      </label>
      <label>
        종류
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as AlbumKind)}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k] || "모름"}
            </option>
          ))}
        </select>
      </label>
      <label>
        발매일 <span className="muted">(선택)</span>
        <input
          type="date"
          value={releasedOn}
          onChange={(e) => setReleasedOn(e.target.value)}
        />
      </label>
      <label>
        커버 주소 <span className="muted">(선택)</span>
        <span className="art-field">
          <Cover url={cover.trim()} large />
          <input
            type="url"
            value={cover}
            onChange={(e) => setCover(e.target.value)}
            placeholder="https://"
          />
        </span>
        <small>
          수록곡에 직접 넣은 앨범아트가 없으면 다음 게시 때 이 커버를 써요.
        </small>
      </label>
    </FormDialog>
  );
}
