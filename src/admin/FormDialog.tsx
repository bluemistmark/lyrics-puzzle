import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  title: string;
  /** Throw an Error to keep the dialog open and show its message. */
  onSubmit: () => Promise<void>;
  onClose: () => void;
  children: ReactNode;
};

/** Modal edit form. Mount it to open, unmount it to close. */
export function FormDialog({ title, onSubmit, onClose, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="form-dialog"
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
          <button className="primary" disabled={saving}>
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
