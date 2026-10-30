import { useEffect, useRef, type ReactNode } from "react";
import { X } from "./icons";

export type ModalName =
  | "play-options"
  | "menu"
  | "daily-menu"
  | "account"
  | "nickname"
  | "report"
  | "share"
  | "record-share"
  | "daily-share"
  | "daily-report"
  | "general-report"
  | "help"
  | "giveup"
  | "daily-giveup"
  | "reset"
  | "shared"
  | "tutorial";

type Props = {
  open: boolean;
  /** Slides the sheet down, then calls onClosed; the content stays until then. */
  closing: boolean;
  /** Asks to close (Esc, backdrop, X): the parent sets `closing`. */
  onClose: () => void;
  /** The sheet is gone: the parent clears what it shows. Keep it stable (useCallback). */
  onClosed: () => void;
  children: ReactNode;
};

/** Single native `<dialog>` shared by every modal, shown as a bottom sheet that slides up
 *  (CSS) and back down (here); closes on Esc, backdrop click, the X button or by pulling its
 *  grip down. */
export function Modal({ open, closing, onClose, onClosed, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  // Where the press started: selecting text in an input and releasing outside the box
  // also clicks the <dialog> itself, which must not close it.
  const pressedBackdrop = useRef(false);
  // Pulling the grip down: where the pull started; far enough on release closes the sheet.
  const pull = useRef<number | null>(null);
  // What had focus before the sheet opened: it gets focus back when the sheet closes.
  const opener = useRef<HTMLElement | null>(null);
  const PULL_TO_CLOSE = 80;
  useEffect(() => {
    const box = dialog.current;
    if (!box) return;
    const shut = () => {
      if (!box.open) return;
      box.close();
      const back = opener.current;
      opener.current = null;
      if (back?.isConnected && document.activeElement === document.body)
        back.focus();
    };
    if (!open) {
      shut();
      return;
    }
    if (!box.open) {
      opener.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      box.showModal();
    }
    if (!closing) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shut();
      onClosed();
      return;
    }
    const timing = {
      duration: 200,
      easing: "cubic-bezier(0.4, 0, 1, 1)",
      fill: "forwards",
    } as const;
    // From where a pull left the sheet, if it was pulled down to close.
    const slide = box.animate(
      [
        { transform: box.style.transform || "translateY(0)" },
        { transform: "translateY(100%)" },
      ],
      timing,
    );
    let fade: Animation | undefined;
    try {
      fade = box.animate([{ opacity: 1 }, { opacity: 0 }], {
        ...timing,
        pseudoElement: "::backdrop",
      });
    } catch {
      /* Without pseudo-element animation the dim just goes with the sheet. */
    }
    slide.finished.then(
      () => {
        shut();
        // Drop the end state, or the next opening would start off screen.
        box.style.transform = "";
        slide.cancel();
        fade?.cancel();
        onClosed();
      },
      () => {},
    );
    return () => {
      slide.cancel();
      fade?.cancel();
    };
  }, [open, closing, onClosed]);
  return (
    <dialog
      ref={dialog}
      className="sheet"
      onCancel={(e) => {
        // Esc: slide down like the other ways out instead of vanishing.
        e.preventDefault();
        onClose();
      }}
      onPointerDown={(e) => {
        pressedBackdrop.current = e.target === dialog.current;
      }}
      onClick={(e) => {
        if (e.target === dialog.current && pressedBackdrop.current) onClose();
      }}
    >
      <div className="modal-inner">
        <div
          className="sheet-grip"
          aria-hidden="true"
          onPointerDown={(e) => {
            pull.current = e.clientY;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (pull.current === null || !dialog.current) return;
            const dy = Math.max(0, e.clientY - pull.current);
            dialog.current.style.transform = `translateY(${dy}px)`;
          }}
          onPointerUp={(e) => {
            const box = dialog.current;
            if (pull.current === null || !box) return;
            const dy = Math.max(0, e.clientY - pull.current);
            pull.current = null;
            if (dy > PULL_TO_CLOSE) {
              onClose();
              return;
            }
            box.style.transform = "";
            box.animate(
              [{ transform: `translateY(${dy}px)` }, { transform: "none" }],
              { duration: 150, easing: "ease-out" },
            );
          }}
          onPointerCancel={() => {
            pull.current = null;
            if (dialog.current) dialog.current.style.transform = "";
          }}
        />
        <button className="close icon-btn" aria-label="닫기" onClick={onClose}>
          <X size={21} />
        </button>
        {children}
      </div>
    </dialog>
  );
}
