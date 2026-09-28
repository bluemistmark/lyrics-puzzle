import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  title: string;
  /** Throw an Error to keep the dialog open and show its message. */
  onSubmit: () => Promise<void>;
  onClose: () => void;
  children: ReactNode;
  submitLabel?: string;
  /** Disables the submit button (e.g. nothing valid to save yet). */
  submitDisabled?: boolean;
  wide?: boolean;
};

/** Modal edit form. Mount it to open, unmount it to close. */
export function FormDialog({
  title,
  onSubmit,
  onClose,
  children,
  submitLabel = "저장",
  submitDisabled = false,
  wide = false,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={wide ? "form-dialog wide" : "form-dialog"}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError("");
          try {
            await onSubmit();
            onClose();
          } catch (err) {
            setError((err as Error).message);
            setSaving(false);
          }
        }}
      >
        <h2>{title}</h2>
        {children}
        <p className="form-error" role="alert">
          {error}
        </p>
        <div className="form-actions">
          <button type="button" onClick={onClose}>
            취소
          </button>
          <button className="primary" disabled={saving || submitDisabled}>
            {saving ? "저장 중…" : submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
