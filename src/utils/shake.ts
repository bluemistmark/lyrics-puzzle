/** A short sideways shake (and a tick of vibration where phones allow it): a guess that
 *  revealed nothing. The shake is skipped with reduced motion. */
export function shake(element: Element | null) {
  navigator.vibrate?.(30);
  if (!element || matchMedia("(prefers-reduced-motion: reduce)").matches)
    return;
  element.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-6px)" },
      { transform: "translateX(5px)" },
      { transform: "translateX(-3px)" },
      { transform: "translateX(0)" },
    ],
    { duration: 300, easing: "ease-out" },
  );
}
