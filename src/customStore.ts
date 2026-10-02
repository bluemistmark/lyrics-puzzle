import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  customQuestion,
  lyricsError,
  MAX_PUZZLES,
  MAX_TITLE_LENGTH,
  parseLyrics,
} from "./custom.ts";
import { hintKeys, matches } from "./game.ts";

// 직접 입력 가사 퍼즐. 게임 스토어·계정 동기화와 분리되어 이 기기의 localStorage에만 저장된다.

export type CustomPuzzle = {
  id: string;
  title: string;
  lines: string[];
  /** 공개된 글자 키 (`줄:토큰:글자`). */
  revealed: string[];
  /** 이번 진행에서 쓴 힌트 수. 처음부터 하면 0으로 돌아간다. */
  hints: number;
};

export type GuessResult = {
  /** 입력과 맞은 글자 수 (이미 열린 것 포함). */
  matched: number;
  /** 이번에 새로 열린 글자 수. */
  gained: number;
};

type CustomStore = {
  puzzles: CustomPuzzle[];
  /** 만들 수 없으면 사유를 돌려준다. */
  add: (
    title: string,
    text: string,
  ) => { ok: true; id: string } | { ok: false; error: string };
  remove: (id: string) => void;
  guess: (id: string, word: string) => GuessResult;
  /** `range`([시작, 끝) 줄)에서 아직 안 열린 단어 하나를 무작위로 열고, 열었는지 돌려준다. */
  hint: (id: string, range?: [number, number]) => boolean;
  /** 진행(공개 글자·힌트 수)을 지우고 가사는 남긴다. */
  resetProgress: (id: string) => void;
};

const newId = () =>
  `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const useCustom = create<CustomStore>()(
  persist(
    (set, get) => {
      const update = (id: string, change: (p: CustomPuzzle) => CustomPuzzle) =>
        set((s) => ({
          puzzles: s.puzzles.map((p) => (p.id === id ? change(p) : p)),
        }));
      return {
        puzzles: [],
        add: (title, text) => {
          const lines = parseLyrics(text);
          const error = lyricsError(lines);
          if (error) return { ok: false, error };
          if (get().puzzles.length >= MAX_PUZZLES)
            return {
              ok: false,
              error: `가사는 ${MAX_PUZZLES}개까지 저장할 수 있어요. 안 쓰는 걸 지워 주세요.`,
            };
          const id = newId();
          const puzzle: CustomPuzzle = {
            id,
            title: title.trim().slice(0, MAX_TITLE_LENGTH) || "제목 없음",
            lines,
            revealed: [],
            hints: 0,
          };
          set((s) => ({ puzzles: [puzzle, ...s.puzzles] }));
          return { ok: true, id };
        },
        remove: (id) =>
          set((s) => ({ puzzles: s.puzzles.filter((p) => p.id !== id) })),
        guess: (id, word) => {
          const puzzle = get().puzzles.find((p) => p.id === id);
          if (!puzzle) return { matched: 0, gained: 0 };
          const question = customQuestion(id, puzzle.title, puzzle.lines);
          const found = matches(question, word, puzzle.revealed);
          const fresh = found.filter((key) => !puzzle.revealed.includes(key));
          if (fresh.length)
            update(id, (p) => ({
              ...p,
              revealed: [...p.revealed, ...fresh],
            }));
          return { matched: found.length, gained: fresh.length };
        },
        hint: (id, range) => {
          const puzzle = get().puzzles.find((p) => p.id === id);
          if (!puzzle) return false;
          const keys = hintKeys(
            customQuestion(id, puzzle.title, puzzle.lines),
            puzzle.revealed,
            range,
          );
          if (!keys.length) return false;
          update(id, (p) => ({
            ...p,
            revealed: [...p.revealed, ...keys],
            hints: p.hints + 1,
          }));
          return true;
        },
        resetProgress: (id) =>
          update(id, (p) => ({ ...p, revealed: [], hints: 0 })),
      };
    },
    { name: "lyrics-custom-v1" },
  ),
);
