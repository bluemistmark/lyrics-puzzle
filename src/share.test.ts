import { test } from "node:test";
import assert from "node:assert/strict";
import type { Question } from "./game.ts";
import {
  parseSharedLink,
  playResultText,
  questionLink,
  shareGrid,
} from "./share.ts";

const q: Question = {
  id: "Q1",
  songId: "S1",
  section: "",
  unit: "U",
  title: "비밀 제목",
  lines: [
    [{ text: "노래" }, { text: " " }, { text: "해요" }],
    [{ text: "love", pronunciation: "러브" }, { text: "!" }],
  ],
};

test("공유 격자는 공개 키마다 한 칸이고 공백·문장부호는 칸이 없음", () => {
  assert.deepEqual(shareGrid(q, ["0:0:1", "1:0:en"]), [
    [
      ["miss", "hit"],
      ["miss", "miss"],
    ],
    [["hit"]],
  ]);
});

test("공유 문구에는 제목과 가사가 들어가지 않고 모드별 결과를 씀", () => {
  const base = {
    solved: true,
    givenUp: false,
    percent: 50,
    guesses: 3,
    hints: 1,
  };
  const classic = playResultText({ ...base, mode: "classic" });
  assert.ok(classic.includes("클래식"));
  assert.ok(classic.includes("제목 정답"));
  assert.ok(!classic.includes(q.title) && !classic.includes("노래해요"));
  assert.ok(playResultText({ ...base, mode: "easy" }).includes("가사 완성"));
  assert.ok(!playResultText({ ...base, mode: "simple" }).includes("가사 복원"));
  assert.ok(
    playResultText({
      ...base,
      solved: false,
      givenUp: true,
      mode: "classic",
    }).includes("정답 확인"),
  );
});

test("같은 문제 링크는 기존 쿼리·해시를 지우고 문제와 모드만 남김", () => {
  assert.equal(
    questionLink("https://example.com/?today=1&code=x#a", "Q1", "easy"),
    "https://example.com/?q=Q1&mode=easy",
  );
});

test("같은 문제 링크를 읽고, 모르는 모드는 클래식으로 봄", () => {
  assert.deepEqual(parseSharedLink("https://example.com/?q=Q1&mode=easy"), {
    id: "Q1",
    mode: "easy",
  });
  assert.deepEqual(parseSharedLink("https://example.com/?q=Q1&mode=hard"), {
    id: "Q1",
    mode: "classic",
  });
  assert.equal(parseSharedLink("https://example.com/?today=1"), null);
});
