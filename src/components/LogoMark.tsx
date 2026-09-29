/** Brand mark drawn inline so each theme can recolor it (--logo-bg, --logo-ink) and
 *  swap the straight bars for the notebook's hand-drawn ones (see style.css). */
export function LogoMark({ size = 42 }: { size?: number }) {
  return (
    <svg
      className="logo-mark"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <rect className="logo-bg" width="64" height="64" rx="17" />
      <g className="logo-bars">
        <path d="M16 27v10" />
        <path d="M24 20v24" />
        <path d="M32 25v14" />
        <path d="M40 16v32" />
        <path d="M48 26v12" />
      </g>
      <g className="logo-doodle">
        <path d="M16 28q1.5 4-.5 9" />
        <path d="M24 21q-2 11 1 23" />
        <path d="M32 26q1.5 6-.5 13" />
        <path d="M40 17q-1.5 15 1 31" />
        <path d="M48 27q1 5-1 11" />
        <path
          d="M52 12c-2-3-6-1-4 2l4 4 4-4c2-3-2-5-4-2z"
          className="logo-heart"
        />
      </g>
    </svg>
  );
}
