import { Flag } from "lucide-react";

/** Small "report this question" link under the play/daily actions. */
export function ReportLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="report-link" onClick={onClick}>
      <Flag size={13} aria-hidden="true" /> 이 문제 오류 제보
    </button>
  );
}
