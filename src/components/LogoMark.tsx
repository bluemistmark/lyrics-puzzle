/** Brand mark drawn inline so each theme can recolor it (--logo-bg, --logo-ink). */
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
    </svg>
  );
}
