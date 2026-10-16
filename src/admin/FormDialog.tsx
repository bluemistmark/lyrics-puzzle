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
  /** Adds a "저장하고 계속" button: after saving it runs this instead of closing. */
  onContinue?: () => void;
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
  onContinue,
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
        onKeyDown={(e) => {
          // Ctrl+Enter (⌘+Enter) saves from any field.
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            if (!saving && !submitDisabled) e.currentTarget.requestSubmit();
          }
        }}
        onSubmit={async (e) => {
          e.preventDefault();
          const keepOpen =
            onContinue &&
            (e.nativeEvent as SubmitEvent).submitter?.dataset.continue ===
              "true";
          setSaving(true);
          setError("");
          try {
            await onSubmit();
            if (keepOpen) {
              onContinue();
              setSaving(false);
            } else onClose();
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
          <span className="muted form-shortcut">Ctrl+Enter로 저장</span>
          <button type="button" onClick={onClose}>
            취소
          </button>
          {onContinue && (
            <button data-continue="true" disabled={saving || submitDisabled}>
              저장하고 계속
            </button>
          )}
          <button className="primary" disabled={saving || submitDisabled}>
            {saving ? "저장 중…" : submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
