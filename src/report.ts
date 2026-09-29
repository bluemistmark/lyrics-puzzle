import { requestJson, useRanking } from "./ranking.ts";

// 오류 제보 (게임 쪽). 서버는 api/report.ts, DB는 supabase/migrations/*_reports.sql.
// No contact details: the anonymous ranking token only limits repeated reports.

export type ReportKind = "lyrics" | "answer" | "bug" | "other";
/** Values mirror api/report.ts; labels are what the player picks from. */
export const REPORT_KINDS: [ReportKind, string][] = [
  ["lyrics", "가사가 틀렸어요"],
  ["answer", "맞는데 인정되지 않아요"],
  ["bug", "화면·기능 오류"],
  ["other", "기타 의견"],
];
export const QUESTION_KINDS: ReportKind[] = ["lyrics", "answer", "other"];
export const GENERAL_KINDS: ReportKind[] = ["bug", "other"];
export const REPORT_MAX = 1000;

export type Report = {
  kind: ReportKind;
  message: string;
  /** Attached when sent from a question screen. */
  questionId?: string;
  mode?: "play" | "daily";
};

export async function sendReport(report: Report) {
  if (!report.message.trim()) throw Error("제보 내용을 적어 주세요.");
  await requestJson("/api/report", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      token: useRanking.getState().ensureToken(),
      ...report,
    }),
  });
}
