import { test } from "node:test";
import assert from "node:assert/strict";
import { csvName, toCsv } from "./csv.ts";

test("엑셀용 CSV: BOM, CRLF, 따옴표·쉼표·줄바꿈 처리, 배열과 불리언 변환", () => {
  assert.equal(
    toCsv([
      ["ID", "가사"],
      ["Q1", ['그는 "안녕", 했다', "둘째 줄"]],
      ["Q2", true],
      ["Q3", "여러\n줄"],
    ]),
    '﻿ID,가사\r\nQ1,"그는 ""안녕"", 했다 / 둘째 줄"\r\nQ2,Y\r\nQ3,"여러\n줄"',
  );
});

test("수식으로 읽힐 수 있는 칸은 글자로 보이게 하고, 파일 이름은 한국 날짜", () => {
  assert.equal(toCsv([["=1+1", "@a", "보통"]]), "﻿'=1+1,'@a,보통");
  assert.equal(
    csvName("songs", new Date("2026-10-10T16:00:00Z")),
    "lyrics-songs-2026-10-11.csv",
  );
});
