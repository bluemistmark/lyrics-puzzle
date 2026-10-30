import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Check } from "./icons";

/** A title guessed: a neon check pops up in the middle of the screen with two rings spreading
 *  out, then fades (with a short buzz where phones allow it). Mount it with a new key to play
 *  it once; it never takes clicks. A caption (a song newly in its playlist) shows under it,
 *  and then it stays a little longer. Drawn into <body>: inside a panel, a moving
 *  (transformed) panel would become its frame and push it off the screen's middle. */
export function Celebration({ caption }: { caption?: string }) {
  useEffect(() => {
    navigator.vibrate?.([20, 40, 20]);
  }, []);
  return createPortal(
    <>
      <div
        className={caption ? "celebration has-caption" : "celebration"}
        aria-hidden="true"
      >
        <i className="celebration-ring" />
        <i className="celebration-ring later" />
        <span className="celebration-check">
          <Check size={34} weight="bold" />
        </span>
        {caption && <p className="celebration-caption">{caption}</p>}
      </div>
      {caption && (
        <p className="sr-only" role="status">
          {caption}
        </p>
      )}
    </>,
    document.body,
  );
}
