/** Theme choices in settings order. Kept free of React so Node tests (업적) can import it. */
export const THEMES = [
  ["system", "시스템"],
  ["light", "라이트"],
  ["dark", "다크"],
] as const;
export type Theme = (typeof THEMES)[number][0];
