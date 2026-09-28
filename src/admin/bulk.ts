export type BulkBlock = { lines: string[]; error?: string };

/**
 * Splits pasted text into questions.
 * - Text with tabs (rows copied from Excel/Sheets): one row = one question, cells = 가사1~3.
 * - Otherwise: questions are separated by blank lines, one lyric line per line.
 * Each question needs 2~3 lines; anything else is kept with an `error` so the preview can show it.
 */
export function parseBulkQuestions(text: string): BulkBlock[] {
  const normalized = text.replace(/\r\n?/g, "\n");
  const blocks = normalized.includes("\t")
    ? normalized
        .split("\n")
        .filter((row) => row.trim())
        .map((row) => {
          const cells = row.split("\t").map((c) => c.trim());
          while (cells.length && !cells[cells.length - 1]) cells.pop();
          return cells;
        })
    : normalized
        .split(/\n[ \t]*\n/)
        .map((block) =>
          block
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        )
        .filter((lines) => lines.length);
  return blocks.map((lines) => {
    if (lines.length > 3)
      return {
        lines,
        error: `${lines.length}줄이에요. 한 문제는 2~3줄이에요.`,
      };
    if (lines.length < 2 || !lines[0] || !lines[1])
      return { lines, error: "가사1·가사2는 필수예요." };
    return { lines: lines.filter(Boolean) };
  });
}

/** Key for spotting the same lyrics twice (ignores surrounding whitespace). */
export const lyricsKey = (lines: string[]) =>
  lines.map((l) => l.trim()).join("\n");
