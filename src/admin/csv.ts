/**
 * CSV that Excel opens correctly with Korean text: UTF-8 BOM, CRLF line ends, quoted cells.
 * Cells starting with a formula character get a leading `'` so Excel shows them as text.
 */
export function toCsv(rows: readonly (readonly unknown[])[]): string {
  const cell = (value: unknown) => {
    let text =
      value === null || value === undefined
        ? ""
        : Array.isArray(value)
          ? value.join(" / ")
          : typeof value === "boolean"
            ? value
              ? "Y"
              : "N"
            : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return "﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
}

/** `lyrics-questions-2026-10-11.csv` (Korean date). */
export const csvName = (kind: string, now = new Date()) =>
  `lyrics-${kind}-${now.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })}.csv`;
