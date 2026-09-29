/** Theme choices in settings order. Kept free of React so Node tests (업적) can import it. */
export const THEMES = [
  ["system", "시스템"],
  ["light", "라이트"],
  ["dark", "다크"],
  ["excel", "엑셀"],
  ["notebook", "노트"],
  ["console", "게임기"],
  ["space", "우주"],
  ["exam", "시험지"],
] as const;
export type Theme = (typeof THEMES)[number][0];
