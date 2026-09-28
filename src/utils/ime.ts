import type { KeyboardEvent } from "react";

/** Stops Enter from submitting a form while a Korean IME is still composing a syllable. */
export function blockComposingEnter(e: KeyboardEvent<HTMLInputElement>) {
  if (e.key === "Enter" && e.nativeEvent.isComposing) e.preventDefault();
}
