import { coverAt } from "../data/artwork.ts";

/** A cover thumbnail (an empty tile when there is none). */
export function Cover({
  url,
  large = false,
}: {
  url?: string;
  large?: boolean;
}) {
  return url ? (
    <img
      className={large ? "song-art large" : "song-art"}
      src={coverAt(url, large ? 200 : 100)}
      alt=""
      loading="lazy"
    />
  ) : (
    <span className={large ? "song-art large" : "song-art"} />
  );
}
