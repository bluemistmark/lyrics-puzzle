import { AlbumArt } from "./AlbumArt";
import { Check, Music } from "./icons";

/** A unit's playlist cover (도감 and the 기록 summary): its guessed songs' 앨범아트, four in a
 *  grid once there are four, like a streaming app's playlist; until there is any, a quiet
 *  tile with a note, so the color on screen always comes from real covers. Decorative. */
export function PlaylistCover({
  arts = [],
  complete = false,
  large = false,
}: {
  /** Covers of the guessed songs, latest first (see `unitArts`). */
  arts?: string[];
  /** Every song collected: a check in the corner. */
  complete?: boolean;
  large?: boolean;
}) {
  const shown = arts.length >= 4 ? arts.slice(0, 4) : arts.slice(0, 1);
  return (
    <span
      className={`playlist-cover${shown.length === 4 ? " cover-art-4" : ""}${large ? " large" : ""}`}
      aria-hidden="true"
    >
      {shown.length > 0 ? (
        shown.map((src) => <AlbumArt key={src} src={src} />)
      ) : (
        <Music size={large ? 36 : 26} />
      )}
      {complete && (
        <span className="cover-complete">
          <Check size={12} weight="bold" />
        </span>
      )}
    </span>
  );
}
