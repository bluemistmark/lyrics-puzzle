import { csvName, toCsv } from "./csv";

/** Downloads `rows()` (header first) as an Excel-friendly CSV. */
export function CsvButton({
  kind,
  rows,
}: {
  /** File name part, e.g. "questions". */
  kind: string;
  rows: () => unknown[][];
}) {
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([toCsv(rows())], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = csvName(kind);
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <button
      onClick={download}
      title="지금 보이는 목록을 엑셀용 CSV로 내려받아요"
    >
      CSV
    </button>
  );
}
