import { useMemo } from "react";
import { compareSongs, type SongRow } from "../data/build-catalog.ts";
import { useAdmin } from "./store";

type Props = { value: string; onChange: (songId: string) => void };

/** Song picker grouped by artist, in the same order as the game. */
export function SongSelect({ value, onChange }: Props) {
  const artists = useAdmin((s) => s.artists);
  const songs = useAdmin((s) => s.songs);
  const grouped = useMemo(() => {
    const map = new Map<string, SongRow[]>();
    for (const s of [...songs].sort(compareSongs(artists)))
      map.set(s.artist, [...(map.get(s.artist) ?? []), s]);
    return [...map];
  }, [songs, artists]);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} required>
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
  );
}
