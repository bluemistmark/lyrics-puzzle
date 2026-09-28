import { useEffect } from "react";
import { useGame } from "../store";

type ModelContext = {
  registerTool: (tool: unknown, options: unknown) => Promise<void>;
};

/** Exposes game actions as WebMCP tools when the browser provides `document.modelContext`. */
export function useModelContextTools() {
  useEffect(() => {
    const ctx = (document as unknown as { modelContext?: ModelContext })
      .modelContext;
    if (!ctx) return;
    const lifecycle = new AbortController();
    const register = (tool: unknown) => {
      try {
        Promise.resolve(
          ctx.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {
        /* Tool registration is optional; the game works without it. */
      }
    };
    register({
      name: "guess_lyric_word",
      description: "입력한 단어와 일치하는 현재 문제의 가사를 공개합니다.",
      inputSchema: {
        type: "object",
        properties: { word: { type: "string", minLength: 1, maxLength: 60 } },
        required: ["word"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async (data: unknown) => {
        const w = (data as { word?: unknown })?.word;
        if (typeof w !== "string" || !w.trim() || w.length > 60)
          throw Error("단어를 입력하세요.");
        useGame.getState().guess(w);
        await new Promise(requestAnimationFrame);
        return { message: useGame.getState().notice };
      },
    });
    return () => lifecycle.abort();
  }, []);
}
