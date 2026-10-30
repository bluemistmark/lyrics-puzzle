import { useState, type ReactNode } from "react";

/** A song's 앨범아트 (shipped with the build, see scripts/artwork.ts). Without one, or when it
 *  fails to load, the fallback shows instead. Decorative: the title is always written next to
 *  it. */
export function AlbumArt({
  src,
  className = "album-art",
  fallback = null,
}: {
  src: string | undefined;
  className?: string;
  fallback?: ReactNode;
}) {
  // Kept per address, so another song's art in the same place gets its own try.
  const [failed, setFailed] = useState<string>();
  if (!src || failed === src) return fallback;
  return (
    <img
      className={className}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(src)}
    />
  );
}
