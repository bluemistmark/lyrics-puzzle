import { useEffect, useRef, type ReactNode } from "react";

/** A sideways row that also scrolls with a mouse: the wheel moves it sideways until it
 *  reaches an end (then the page scrolls on), and it can be dragged. */
export function ScrollRow({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const max = el.scrollWidth - el.clientWidth;
      if (
        (e.deltaY < 0 && el.scrollLeft <= 0) ||
        (e.deltaY > 0 && el.scrollLeft >= max - 1)
      )
        return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    let start: { x: number; left: number } | null = null;
    let dragged = false;
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      start = { x: e.clientX, left: el.scrollLeft };
      dragged = false;
    };
    const move = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      if (Math.abs(dx) > 4) dragged = true;
      el.scrollLeft = start.left - dx;
    };
    const up = () => {
      start = null;
    };
    // A drag that ends over a card isn't a click on it.
    const click = (e: MouseEvent) => {
      if (dragged) {
        e.stopPropagation();
        e.preventDefault();
        dragged = false;
      }
    };
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    el.addEventListener("click", click, true);
    return () => {
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      el.removeEventListener("click", click, true);
    };
  }, []);
  return (
    <div ref={row} className={className}>
      {children}
    </div>
  );
}
