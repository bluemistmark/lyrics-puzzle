import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export type ModalName =
  | "title"
  | "daily-title"
  | "units"
  | "modes"
  | "theme"
  | "account"
  | "nickname"
  | "report"
  | "daily-report"
  | "general-report"
  | "help"
  | "giveup"
  | "daily-giveup"
  | "reset"
  | "shared"
  | "tutorial";

type Props = { open: boolean; onClose: () => void; children: ReactNode };

/** Single native `<dialog>` shared by every modal; closes on Esc, backdrop click or the X button. */
export function Modal({ open, onClose, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  // Where the press started: selecting text in an input and releasing outside the box
  // also clicks the <dialog> itself, which must not close it.
  const pressedBackdrop = useRef(false);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      onPointerDown={(e) => {
        pressedBackdrop.current = e.target === dialog.current;
      }}
      onClick={(e) => {
        if (e.target === dialog.current && pressedBackdrop.current) onClose();
      }}
    >
      <div className="modal-inner">
        <button className="close icon-btn" aria-label="닫기" onClick={onClose}>
          <X size={21} />
        </button>
        {children}
      </div>
    </dialog>
  );
}
