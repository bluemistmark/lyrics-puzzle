import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export type ModalName =
  "title" | "units" | "theme" | "help" | "giveup" | "reset";

type Props = { open: boolean; onClose: () => void; children: ReactNode };

/** Single native `<dialog>` shared by every modal; closes on Esc, backdrop click or the X button. */
export function Modal({ open, onClose, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
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
