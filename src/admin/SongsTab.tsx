import { useMemo, useRef, useState } from "react";
import { KIND_LABELS } from "../data/albums.ts";
import {
  compareSongs,
  sortArtists,
  type AlbumRow,
  type SongRow,
} from "../data/build-catalog.ts";
import { Cover } from "./Cover";
import { CsvButton } from "./CsvButton";
import { FormDialog } from "./FormDialog";
import { joinList, nextSongId, splitList } from "./ids";
import {
  albumIdFor,
  fillSong,
  suggestAlbum,
  type AlbumSuggestion,
} from "./lookup";
import { QuestionForm } from "./QuestionForm";
import { SortHeader, useSortParam } from "./SortHeader";
import { useAdmin } from "./store";
import { byCode, byText, matchesQuery, shortTime, sortRows } from "./table.ts";
import { useRoute, useRouteParam } from "./useRoute";

const SORT_KEYS = [
  "order",
  "id",
  "title",
  "album",
  "titleTrack",
  "released",
  "questions",
  "updated",
] as const;

export function SongsTab() {
  const artists = useAdmin((s) => s.artists);
  const songs = useAdmin((s) => s.songs);
  const questions = useAdmin((s) => s.questions);
  const removeSong = useAdmin((s) => s.removeSong);
  const artwork = useAdmin((s) => s.artwork);
  const albums = useAdmin((s) => s.albums);
  const go = useRoute((s) => s.go);
  const clearParams = useRoute((s) => s.clearParams);
  const releases = useAdmin((s) => s.releases);
  const [artist, setArtist] = useRouteParam("artist");
  /** An album id, or "none" for songs without one. */
  const [albumParam, setAlbumParam] = useRouteParam("album");
  const [query, setQuery] = useRouteParam("q");
  const [titleParam, setTitleParam] = useRouteParam("title");
  const onlyTitle = titleParam === "1";
  const [sort, setSort] = useSortParam(SORT_KEYS, {
    key: "order",
    desc: false,
  });
  const filtered = Boolean(artist || albumParam || query || onlyTitle);
  const albumById = useMemo(
    () => new Map(albums.map((a) => [a.id, a])),
    [albums],
  );
  const albumOf = (s: SongRow) =>
    s.album_id == null ? undefined : albumById.get(s.album_id);
  const withoutAlbum = songs.filter((s) => s.album_id == null);
  const [editing, setEditing] = useState<SongRow | "new" | null>(null);
  /** Song whose 문제 추가 form is open. */
  const [addingTo, setAddingTo] = useState<string | null>(null);

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
  const visible = useMemo(() => {
    const albumOf = (s: SongRow) =>
      s.album_id == null ? undefined : albumById.get(s.album_id);
    const rows = [...songs]
      .sort(compareSongs(artists))
      .filter(
        (s) =>
          (!artist || s.artist === artist) &&
          (!albumParam ||
            (albumParam === "none"
              ? s.album_id == null
              : String(s.album_id) === albumParam)) &&
          (!onlyTitle || s.title_track) &&
          matchesQuery(
            [s.id, s.artist, s.title, albumOf(s)?.title, ...s.aliases],
            query,
          ),
      );
    const count = (s: SongRow) => counts.get(s.id) ?? { total: 0, active: 0 };
    const compare = {
      // Rows already come in the game's order.
      order: () => 0,
      id: (a: SongRow, b: SongRow) => byCode(a.id, b.id),
      title: (a: SongRow, b: SongRow) => byText(a.title, b.title),
      // Songs without an album come last.
      album: (a: SongRow, b: SongRow) =>
        Number(!albumOf(a)) - Number(!albumOf(b)) ||
        byText(albumOf(a)?.title ?? "", albumOf(b)?.title ?? ""),
      // Title tracks first.
      titleTrack: (a: SongRow, b: SongRow) =>
        Number(!a.title_track) - Number(!b.title_track),
      // Songs without a release date come last either way.
      released: (a: SongRow, b: SongRow) => {
        const x = albumOf(a)?.released_on ?? "";
        const y = albumOf(b)?.released_on ?? "";
        return (Number(!x) - Number(!y)) * (sort.desc ? -1 : 1) || byCode(x, y);
      },
      questions: (a: SongRow, b: SongRow) =>
        count(a).active - count(b).active || count(a).total - count(b).total,
      updated: (a: SongRow, b: SongRow) => byCode(a.updated_at, b.updated_at),
    }[sort.key];
    return sortRows(rows, compare, sort.desc);
  }, [
    songs,
    artists,
    artist,
    albumParam,
    albumById,
    onlyTitle,
    query,
    sort,
    counts,
  ]);
  const albumOptions = useMemo(() => sortAlbums(albums), [albums]);

  const remove = async (song: SongRow) => {
    const n = counts.get(song.id)?.total ?? 0;
    // Published songs: deleting drops their questions from players' 도감 and records.
    if (
      releases[0]?.song_ids.includes(song.id) &&
      !confirm(
        `"${song.title}"은(는) 게임에 게시된 곡이에요. 삭제하면 이 곡 문제를 맞힌 플레이어의 도감·기록에서 빠져요.
게임에서만 빼려면 삭제 대신 문제를 미사용으로 바꾸세요(문제 수를 누르면 이동해요). 계속할까요?`,
      )
    )
      return;
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
        <select value={artist} onChange={(e) => setArtist(e.target.value)}>
          <option value="">전체 가수</option>
          {sortArtists(artists).map((a) => (
            <option key={a.name}>{a.name}</option>
          ))}
        </select>
        <select
          value={albumParam}
          onChange={(e) => setAlbumParam(e.target.value)}
          aria-label="앨범"
        >
          <option value="">전체 앨범</option>
          <option value="none">앨범 없음</option>
          {albumOptions.map((a) => (
            <option key={a.id} value={String(a.id)}>
              {albumLabel(a)}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="ID, 가수, 곡명, 앨범, 별칭, 초성 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={onlyTitle}
            onChange={(e) => setTitleParam(e.target.checked ? "1" : "")}
          />
          타이틀곡만
        </label>
        {filtered && (
          <button onClick={() => clearParams(["sort"])}>필터 초기화</button>
        )}
        <span className="admin-spacer" />
        <span className="muted">
          {filtered
            ? `${visible.length} / ${songs.length}곡`
            : `${songs.length}곡`}
        </span>
        <CsvButton
          kind="songs"
          rows={() => [
            [
              "곡ID",
              "가수",
              "곡명",
              "앨범",
              "타이틀곡",
              "발매일",
              "정답 별칭",
              "사용 문제",
              "전체 문제",
            ],
            ...visible.map((s) => [
              s.id,
              s.artist,
              s.title,
              albumOf(s)?.title ?? "",
              Boolean(s.title_track),
              albumOf(s)?.released_on ?? "",
              s.aliases,
              counts.get(s.id)?.active ?? 0,
              counts.get(s.id)?.total ?? 0,
            ]),
          ]}
        />
        <FillAlbums songs={withoutAlbum} />
        <button
          className="primary"
          onClick={() => setEditing("new")}
          disabled={!artists.length}
          title={
            artists.length ? undefined : "가수 탭에서 가수를 먼저 추가하세요."
          }
        >
          곡 추가
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th aria-label="앨범아트" />
              <SortHeader
                label="곡ID"
                sortKey="id"
                sort={sort}
                onSort={setSort}
              />
              <SortHeader
                label="가수"
                sortKey="order"
                sort={sort}
                onSort={setSort}
              />
              <SortHeader
                label="곡명"
                sortKey="title"
                sort={sort}
                onSort={setSort}
              />
              <SortHeader
                label="앨범"
                sortKey="album"
                sort={sort}
                onSort={setSort}
              />
              <SortHeader
                label="타이틀"
                sortKey="titleTrack"
                sort={sort}
                onSort={setSort}
              />
              <SortHeader
                label="발매일"
                sortKey="released"
                sort={sort}
                onSort={setSort}
                firstDesc
              />
              <th>정답 별칭</th>
              <SortHeader
                label="문제(사용/전체)"
                sortKey="questions"
                sort={sort}
                onSort={setSort}
              />
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
            {visible.map((s) => {
              const c = counts.get(s.id);
              return (
                <tr key={s.id}>
                  <td>
                    <Cover url={artwork[s.id]?.url || albumOf(s)?.cover_url} />
                  </td>
                  <td className="mono">{s.id}</td>
                  <td>{s.artist}</td>
                  <td>{s.title}</td>
                  <td>
                    {albumOf(s) && (
                      <button
                        className="link"
                        title="이 앨범의 곡만 보기"
                        onClick={() => setAlbumParam(String(s.album_id))}
                      >
                        {albumOf(s)!.title}
                      </button>
                    )}
                  </td>
                  <td>
                    {s.title_track && <span className="badge">타이틀</span>}
                  </td>
                  <td className="nowrap">{albumOf(s)?.released_on}</td>
                  <td>{joinList(s.aliases)}</td>
                  <td>
                    <button
                      className={c?.active ? "link" : "link warn-text"}
                      title="이 곡의 문제 보기"
                      onClick={() => go("questions", { song: s.id })}
                    >
                      {c?.active ?? 0}/{c?.total ?? 0}
                    </button>
                  </td>
                  <td className="muted nowrap">{shortTime(s.updated_at)}</td>
                  <td className="row-actions">
                    <button onClick={() => setAddingTo(s.id)}>문제 추가</button>
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
          defaultArtist={artist}
          onClose={() => setEditing(null)}
        />
      )}
      {addingTo && (
        <QuestionForm
          question={null}
          defaultSongId={addingTo}
          onClose={() => setAddingTo(null)}
        />
      )}
    </section>
  );
}

function SongForm({
  song,
  defaultArtist,
  onClose,
}: {
  song: SongRow | null;
  defaultArtist: string;
  onClose: () => void;
}) {
  const artists = useAdmin((s) => s.artists);
  const songs = useAdmin((s) => s.songs);
  const saveSong = useAdmin((s) => s.saveSong);
  const saveArtwork = useAdmin((s) => s.saveArtwork);
  const art = useAdmin((s) => (song ? s.artwork[song.id] : undefined));
  const albums = useAdmin((s) => s.albums);
  const artworkError = useAdmin((s) => s.artworkError);
  const isNew = !song;
  const [artist, setArtist] = useState(song?.artist ?? defaultArtist);
  const [title, setTitle] = useState(song?.title ?? "");
  const [aliases, setAliases] = useState(joinList(song?.aliases ?? []));
  /** An album id, "new" for the one 자동 채우기 found but isn't saved yet, or "" for none. */
  const [albumId, setAlbumId] = useState(
    song?.album_id == null ? "" : String(song.album_id),
  );
  const [titleTrack, setTitleTrack] = useState(song?.title_track ?? false);
  const [suggestion, setSuggestion] = useState<AlbumSuggestion | null>(null);
  const [lookup, setLookup] = useState("");
  const [artUrl, setArtUrl] = useState(art?.url ?? "");
  const [id, setId] = useState<string>();
  // Until the id is typed by hand, suggest the next one from the artist's prefix.
  const prefix = artists.find((a) => a.name === artist)?.prefix ?? "";
  const shownId = song?.id ?? id ?? nextSongId(songs, prefix);
  const options = useMemo(() => sortAlbums(albums), [albums]);
  const autofill = async () => {
    if (!artist.trim() || !title.trim())
      return setLookup("가수와 곡명을 먼저 넣어 주세요.");
    setLookup("찾는 중…");
    try {
      const found = await suggestAlbum({
        artist: artist.trim(),
        title: title.trim(),
        aliases: splitList(aliases),
      });
      if (!found)
        return setLookup(
          "Deezer·iTunes에서 찾지 못했어요. 앨범 탭에서 추가해 주세요.",
        );
      setSuggestion(found);
      setAlbumId(found.existing ? String(found.existing.id) : "new");
      setTitleTrack(found.titleTrack);
      setLookup(
        `${found.existing ? "저장된 앨범" : "새 앨범"}: ${albumLabel(found.found)}${found.found.kind ? ` (${KIND_LABELS[found.found.kind]})` : ""}. 타이틀곡은 ${found.titleTrack ? "맞는 것으로" : "아닌 것으로"} 추정했어요.`,
      );
    } catch (error) {
      setLookup((error as Error).message);
    }
  };

  return (
    <FormDialog
      title={isNew ? "곡 추가" : "곡 수정"}
      onClose={onClose}
      onSubmit={async () => {
        if (!shownId.trim() || !artist.trim() || !title.trim())
          throw Error("곡ID, 가수명, 곡명은 필수예요.");
        const album_id =
          albumId === "new" && suggestion
            ? await albumIdFor(suggestion)
            : albumId
              ? Number(albumId)
              : null;
        await saveSong(
          {
            id: shownId.trim(),
            artist: artist.trim(),
            title: title.trim(),
            aliases: splitList(aliases),
            album_id,
            title_track: titleTrack,
            sort_order:
              song?.sort_order ??
              Math.max(-1, ...songs.map((s) => s.sort_order)) + 1,
          },
          isNew,
        );
        // After the song: the cover row refers to it.
        if (!artworkError && artUrl.trim() !== (art?.url ?? ""))
          await saveArtwork(shownId.trim(), artUrl.trim());
      }}
    >
      <label>
        가수
        <select
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          required
        >
          <option value="">가수 선택</option>
          {sortArtists(artists).map((a) => (
            <option key={a.name} value={a.name}>
              {a.name} ({a.prefix})
            </option>
          ))}
        </select>
        <small>새 가수는 가수 탭에서 먼저 추가하세요.</small>
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
        앨범 <span className="muted">(선택)</span>
        <span className="album-field">
          <select value={albumId} onChange={(e) => setAlbumId(e.target.value)}>
            <option value="">앨범 없음</option>
            {suggestion && !suggestion.existing && (
              <option value="new">
                새 앨범: {albumLabel(suggestion.found)}
              </option>
            )}
            {options.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {albumLabel(a)}
              </option>
            ))}
          </select>
          <button type="button" onClick={autofill}>
            자동 채우기
          </button>
        </span>
        <small role="status">
          {lookup ||
            "자동 채우기는 Deezer·iTunes에서 앨범·발매일을 찾고 타이틀곡 여부를 추정해요."}
        </small>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={titleTrack}
          onChange={(e) => setTitleTrack(e.target.checked)}
        />
        타이틀곡
      </label>
      <small className="form-note">
        앨범·타이틀곡은 어드민 검색·정렬용이라 게임에는 표시되지 않아요. 앨범
        정보는 앨범 탭에서 고쳐요.
      </small>
      <label>
        앨범아트 주소 <span className="muted">(선택)</span>
        <span className="art-field">
          <Cover url={artUrl.trim()} large />
          <input
            type="url"
            value={artUrl}
            onChange={(e) => setArtUrl(e.target.value)}
            disabled={Boolean(artworkError)}
            placeholder="https://"
          />
        </span>
        <small>
          {artworkError
            ? `앨범아트를 불러오지 못했어요: ${artworkError}`
            : !art
              ? "비워 두면 게시할 때 앨범 커버를 쓰거나 Deezer·iTunes에서 자동으로 찾아요."
              : art.manual
                ? "직접 넣은 주소예요. 비우면 다음 게시 때 자동으로 다시 찾아요."
                : art.url
                  ? "자동으로 찾은 커버예요. 틀렸으면 맞는 이미지 주소로 바꿔 주세요."
                  : "자동으로 찾지 못했어요. 커버가 있는 앨범을 지정하거나 이미지 주소를 넣어 주세요."}
        </small>
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
            ? "가수 접두어로 다음 번호를 제안해요. 저장 후에는 바꿀 수 없어요."
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

/** Newest first; albums without a date last. */
const sortAlbums = (albums: AlbumRow[]) =>
  [...albums].sort(
    (a, b) =>
      Number(!a.released_on) - Number(!b.released_on) ||
      (b.released_on ?? "").localeCompare(a.released_on ?? "") ||
      a.title.localeCompare(b.title),
  );
const albumLabel = (a: Pick<AlbumRow, "title" | "artist" | "released_on">) =>
  [a.title, a.artist, a.released_on].filter(Boolean).join(" · ");

type FillState = {
  done: number;
  total: number;
  found: number;
  missing: string[];
  error: string;
  running: boolean;
};

/** 앨범 자동 채우기 for every song without an album, one at a time (Deezer and iTunes have
 *  rate limits). Songs it can't find stay without one, listed at the end. */
function FillAlbums({ songs }: { songs: SongRow[] }) {
  const [state, setState] = useState<FillState | null>(null);
  const stop = useRef(false);
  const run = async () => {
    if (
      !confirm(
        `앨범이 없는 ${songs.length}곡의 앨범을 Deezer·iTunes에서 찾아 채울까요? 곡이 많으면 몇 분 걸려요.`,
      )
    )
      return;
    stop.current = false;
    const next: FillState = {
      done: 0,
      total: songs.length,
      found: 0,
      missing: [],
      error: "",
      running: true,
    };
    setState({ ...next });
    for (const song of songs) {
      if (stop.current) break;
      try {
        let ok: boolean;
        try {
          ok = await fillSong(song);
        } catch {
          // Usually a rate limit: wait and try this song once more.
          await new Promise((done) => setTimeout(done, 20_000));
          ok = await fillSong(song);
        }
        if (ok) next.found++;
        else next.missing.push(song.title);
      } catch (error) {
        next.error = (error as Error).message;
        break;
      }
      next.done++;
      setState({ ...next, missing: [...next.missing] });
    }
    setState({ ...next, missing: [...next.missing], running: false });
  };

  return (
    <>
      <button
        onClick={run}
        disabled={!songs.length || state?.running}
        title={songs.length ? undefined : "모든 곡에 앨범이 있어요."}
      >
        앨범 자동 채우기{songs.length > 0 && ` (${songs.length})`}
      </button>
      {state && (
        <div className="fill-status" role="status">
          {state.running ? (
            <>
              앨범 찾는 중 {state.done}/{state.total} · 찾음 {state.found}{" "}
              <button onClick={() => (stop.current = true)}>중지</button>
            </>
          ) : (
            <>
              {state.found}곡 채움
              {state.done < state.total &&
                ` · ${state.total - state.done}곡은 하지 못함`}
              {state.error && (
                <span className="warn-text"> · {state.error}</span>
              )}
              {state.missing.length > 0 && (
                <details>
                  <summary>못 찾은 곡 {state.missing.length}곡</summary>
                  {state.missing.join(", ")}
                </details>
              )}{" "}
              <button onClick={() => setState(null)}>닫기</button>
            </>
          )}
        </div>
      )}
    </>
  );
}
