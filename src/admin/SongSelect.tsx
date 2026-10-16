import { Fragment, useId, useMemo, useState, type KeyboardEvent } from "react";
import { compareSongs, type SongRow } from "../data/build-catalog.ts";
import { useAdmin } from "./store";
import { matchesQuery } from "./table.ts";

// Recently picked songs, per browser (a convenience; losing it is harmless).
const RECENT_KEY = "lyrics-admin-recent-songs";
const RECENT_MAX = 5;
function readRecent(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}
function remember(id: string) {
  try {
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify(
        [id, ...readRecent().filter((v) => v !== id)].slice(0, RECENT_MAX),
      ),
    );
  } catch {
    /* Storage may be unavailable. */
  }
}

type Option = { song: SongRow | null; group: string };
type Props = {
  value: string;
  onChange: (songId: string) => void;
  /** Label of a "no song" choice (e.g. a filter's 전체 곡); without it a song has to be picked. */
  emptyLabel?: string;
  /** Lists only this artist's songs. */
  artist?: string;
};

/**
 * Song picker with search (곡명·초성·ID·가수·앨범·별칭), grouped by artist in the game's order,
 * with recently picked songs on top.
 */
export function SongSelect({
  value,
  onChange,
  emptyLabel,
  artist = "",
}: Props) {
  const artists = useAdmin((s) => s.artists);
  const songs = useAdmin((s) => s.songs);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState(readRecent);

  const ordered = useMemo(
    () =>
      [...songs]
        .sort(compareSongs(artists))
        .filter((s) => !artist || s.artist === artist),
    [songs, artists, artist],
  );
  const options = useMemo(() => {
    const list: Option[] = [];
    const searching = query.trim() !== "";
    if (!searching) {
      if (emptyLabel) list.push({ song: null, group: "" });
      for (const id of recent) {
        const song = ordered.find((s) => s.id === id);
        if (song) list.push({ song, group: "최근 선택" });
      }
    }
    for (const song of ordered)
      if (
        matchesQuery(
          [song.title, song.id, song.artist, song.album, ...song.aliases],
          query,
        )
      )
        list.push({ song, group: song.artist });
    return list;
  }, [ordered, query, recent, emptyLabel]);
  const selected = songs.find((s) => s.id === value);
  const label = selected
    ? `${selected.title} · ${selected.artist}`
    : (emptyLabel ?? "");

  const optionId = (i: number) => `${listId}-${i}`;
  const move = (i: number) => {
    const next = Math.max(0, Math.min(options.length - 1, i));
    setActive(next);
    document.getElementById(optionId(next))?.scrollIntoView({
      block: "nearest",
    });
  };
  const choose = (song: SongRow | null) => {
    onChange(song?.id ?? "");
    if (song) remember(song.id);
    setOpen(false);
  };
  const openList = () => {
    setRecent(readRecent());
    setQuery("");
    setActive(0);
    setOpen(true);
  };
  const keyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) openList();
      else move(active + (e.key === "ArrowDown" ? 1 : -1));
    } else if (e.key === "Enter" && open && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const option = options[active];
      if (option) choose(option.song);
    } else if (e.key === "Escape" && open) {
      // Close the list only, not the dialog around it.
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div className="combo">
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && options[active] ? optionId(active) : undefined
        }
        value={open ? query : label}
        placeholder={open ? label || "곡명·초성·ID·앨범 검색" : "곡 선택"}
        onFocus={openList}
        onClick={() => !open && openList()}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={keyDown}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="combo-list"
          // Keeps focus in the input while scrolling or clicking the list.
          onMouseDown={(e) => e.preventDefault()}
        >
          {options.length === 0 && (
            <li className="combo-empty">일치하는 곡이 없어요.</li>
          )}
          {options.map((option, i) => (
            <Fragment key={`${option.group}:${option.song?.id ?? ""}`}>
              {option.group && option.group !== options[i - 1]?.group && (
                <li role="presentation" className="combo-group">
                  {option.group}
                </li>
              )}
              <li
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                className={option.song?.id === value ? "current" : undefined}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(option.song)}
              >
                {option.song ? (
                  <>
                    {option.song.title}{" "}
                    <span className="muted mono">{option.song.id}</span>
                    {option.song.album && (
                      <span className="muted"> · {option.song.album}</span>
                    )}
                  </>
                ) : (
                  emptyLabel
                )}
              </li>
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}
