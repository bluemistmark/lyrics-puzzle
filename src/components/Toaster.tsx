import { useCallback, useEffect, useRef } from "react";
import { useGame } from "../store";
import { useToast } from "../toast";

const SHOWN_MS = 2500;
const ERROR_MS = 5000;
/** Pulled down this far and let go, a toast goes away. */
const PULL_TO_DISMISS = 36;

const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The first queued toast, above the tab bar (and above an achievement toast when one is
 *  showing). It is a popover so it also shows over an open sheet, which sits in the top layer.
 *  It slides down as it leaves, and can be pulled down to dismiss. */
export function Toaster() {
  const current = useToast((s) => s.queue[0]);
  const dismiss = useToast((s) => s.dismiss);
  const lifted = useGame((s) => s.justUnlocked.length > 0);
  const box = useRef<HTMLDivElement>(null);
  const item = useRef<HTMLDivElement>(null);
  const pull = useRef<number | null>(null);

  // Slide down and fade from wherever it is (a pull may have moved it), then drop it.
  const leave = useCallback(
    (id: number) => {
      const el = item.current;
      if (!el || reducedMotion()) {
        dismiss(id);
        return;
      }
      el.animate(
        [
          { transform: el.style.transform || "translateY(0)", opacity: 1 },
          { transform: "translateY(140%)", opacity: 0 },
        ],
        { duration: 220, easing: "ease-in", fill: "forwards" },
      ).finished.then(
        () => dismiss(id),
        () => dismiss(id),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    if (!current) return;
    const timer = window.setTimeout(
      () => leave(current.id),
      current.error ? ERROR_MS : SHOWN_MS,
    );
    return () => window.clearTimeout(timer);
  }, [current, leave]);
  // Show it again on each toast so it stacks above whatever opened last.
  useEffect(() => {
    const el = box.current;
    if (!el || !current) return;
    try {
      if (el.matches(":popover-open")) el.hidePopover();
      el.showPopover();
    } catch {
      /* No popover support: it stays an ordinary fixed element. */
    }
    return () => {
      try {
        if (el.matches(":popover-open")) el.hidePopover();
      } catch {
        /* As above. */
      }
    };
  }, [current]);

  return (
    <>
      <p className="sr-only" role="status">
        {current?.text}
      </p>
      <div
        ref={box}
        popover="manual"
        className={`toast-region${lifted ? " lifted" : ""}`}
      >
        {current && (
          <div
            ref={item}
            key={current.id}
            className={current.error ? "toast error" : "toast"}
            onPointerDown={(e) => {
              // The action button keeps its own press.
              if ((e.target as Element).closest("button")) return;
              pull.current = e.clientY;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (pull.current === null) return;
              const dy = Math.max(0, e.clientY - pull.current);
              e.currentTarget.style.transform = `translateY(${dy}px)`;
            }}
            onPointerUp={(e) => {
              if (pull.current === null) return;
              const dy = Math.max(0, e.clientY - pull.current);
              pull.current = null;
              if (dy > PULL_TO_DISMISS) {
                leave(current.id);
                return;
              }
              const el = e.currentTarget;
              el.style.transform = "";
              el.animate(
                [{ transform: `translateY(${dy}px)` }, { transform: "none" }],
                { duration: 150, easing: "ease-out" },
              );
            }}
            onPointerCancel={(e) => {
              pull.current = null;
              e.currentTarget.style.transform = "";
            }}
          >
            <span aria-hidden="true">{current.text}</span>
            {current.action && (
              <button
                type="button"
                onClick={() => {
                  current.action!.run();
                  leave(current.id);
                }}
              >
                {current.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
