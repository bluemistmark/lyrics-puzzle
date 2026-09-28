import { test } from "node:test";
import assert from "node:assert/strict";
import { lyricsKey, parseBulkQuestions } from "./bulk.ts";
import { nextQuestionIds } from "./ids.ts";

test("빈 줄로 문제 구분, 앞뒤 공백·여러 빈 줄·CRLF 허용", () => {
  const text = "  가사1 \r\n가사2\r\n\r\n\r\n하나\n둘\n셋\n   \n끝1\n끝2\n";
  assert.deepEqual(parseBulkQuestions(text), [
    { lines: ["가사1", "가사2"] },
    { lines: ["하나", "둘", "셋"] },
    { lines: ["끝1", "끝2"] },
  ]);
});

test("줄 수가 맞지 않으면 오류로 표시하고 목록에는 남김", () => {
  const blocks = parseBulkQuestions("한 줄뿐\n\n1\n2\n3\n4");
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].error, "가사1·가사2는 필수예요.");
  assert.equal(blocks[1].error, "4줄이에요. 한 문제는 2~3줄이에요.");
});

test("탭이 있으면 엑셀 행 모드: 한 행 = 한 문제, 빈 칸 처리", () => {
  const text = "a1\ta2\ta3\nb1\tb2\t\n\nc1\t\tc3\nd1\td2\td3\td4";
  const blocks = parseBulkQuestions(text);
  assert.deepEqual(blocks[0], { lines: ["a1", "a2", "a3"] });
  assert.deepEqual(blocks[1], { lines: ["b1", "b2"] });
  assert.equal(blocks[2].error, "가사1·가사2는 필수예요.");
  assert.equal(blocks[3].error, "4줄이에요. 한 문제는 2~3줄이에요.");
  assert.equal(blocks.length, 4);
});

test("빈 입력은 문제 없음", () => {
  assert.deepEqual(parseBulkQuestions(" \n\n "), []);
});

test("중복 판별 키는 앞뒤 공백 무시", () => {
  assert.equal(lyricsKey([" a ", "b"]), lyricsKey(["a", "b "]));
  assert.notEqual(lyricsKey(["a", "b"]), lyricsKey(["a", "c"]));
});

test("연속 문제ID 생성", () => {
  const q = (id: string) => ({ id, song_id: "s", lines: [], active: true });
  assert.deepEqual(nextQuestionIds([q("NCT_0642")], 3), [
    "NCT_0643",
    "NCT_0644",
    "NCT_0645",
  ]);
  assert.deepEqual(nextQuestionIds([], 0), []);
});
