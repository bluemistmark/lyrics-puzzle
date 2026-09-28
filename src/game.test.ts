import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog } from "./catalog.ts";
import {
  matches,
  questions,
  songs,
  units,
  initial,
  pickQuestion,
  progress,
  allKeys,
  tokenize,
  titleMatches,
  type Question,
} from "./game.ts";
const fixture = (s: string): Question => ({
  id: "test",
  songId: "test",
  section: "",
  unit: "test",
  title: "test",
  lines: [tokenize(s)],
});
test("전체 활성 데이터와 원문 보존", () => {
  assert.equal(questions.length, 642);
  assert.equal(songs.length, 165);
  assert.equal(catalog.dictionary.length, 525);
  assert.deepEqual(units, ["NCT U", "NCT 127", "NCT DREAM", "NCT WISH"]);
  for (const q of questions) {
    const raw = catalog.questions.find((r) => r.id === q.id)!;
    assert.deepEqual(
      q.lines.map((line) => line.map((t) => t.text).join("")),
      raw.lines,
    );
    assert.ok(allKeys(q).length);
  }
});
test("초성, 반복 부분 일치, 한 글자 제한", () => {
  assert.equal(initial("꿈"), "ㄲ");
  const q = fixture("너의 마음이 내 마음에 닿아!");
  assert.equal(matches(q, "마음").length, 4);
  assert.equal(matches(q, "너").length, 0);
  assert.equal(matches(q, "내").length, 1);
  assert.equal(matches(q, "!").length, 0);
});
test("영어 원문, 표시발음, 대체발음과 구절 매칭", () => {
  const q = fixture("City, Piñata! I'm 90's love");
  assert.deepEqual(matches(q, "CITY"), matches(q, "씨티"));
  assert.deepEqual(matches(q, "Piñata"), matches(q, "피나타"));
  assert.equal(matches(q, "90's love").length, 1);
  assert.equal(matches(q, "나인티스 러브").length, 1);
  assert.equal(matches(q, "암").length, 1);
});
test("전체 가사를 입력해 모든 문제 완성 가능, 공백과 문장부호는 제외", () => {
  for (const q of questions) {
    const reveal = new Set<string>();
    for (const line of q.lines)
      for (const t of line) for (const k of matches(q, t.text)) reveal.add(k);
    assert.deepEqual([...reveal].sort(), allKeys(q).sort(), q.id);
    assert.equal(
      progress(q, [...reveal]).count,
      progress(q, [...reveal]).total,
    );
  }
});
test("모든 사전 대체발음과 원문이 같은 구간을 공개", () => {
  for (const q of questions)
    for (const line of q.lines)
      for (const t of line)
        if (t.pronunciation) {
          const expected = matches(q, t.text);
          for (const alias of [t.pronunciation, ...(t.alternatives || [])]) {
            const actual = matches(q, alias);
            assert.ok(
              expected.every((k) => actual.includes(k)),
              q.id,
            );
          }
        }
});
test("괄호 제목과 영문 제목 정답 인정", () => {
  const q = questions.find((q) => q.title === "삐그덕 (Walk)")!;
  assert.ok(titleMatches(q, "삐그덕"));
  assert.ok(titleMatches(q, "WALK"));
  assert.ok(titleMatches(q, "삐그덕(walk)"));
  assert.ok(!titleMatches(q, "다른 노래"));
});
test("유닛 필터, 중복 문제와 동일 곡 연속 방지", () => {
  const q = questions[0];
  for (let i = 0; i < 50; i++) {
    const next = pickQuestion(["NCT U"], [q.id], q.id);
    assert.equal(next.unit, "NCT U");
    assert.notEqual(next.songId, q.songId);
  }
  assert.ok(pickQuestion([], [], q.id));
});

test("입력 단어의 일부만 맞아도 연속 두 글자 이상 공개", () => {
  const q = fixture("너의 마음을 사랑으로 채워");
  assert.equal(matches(q, "마음이").length, 2);
  assert.equal(matches(q, "사랑해").length, 2);
  assert.equal(matches(q, "마당").length, 0);
  assert.equal(matches(q, "마음이 사랑해").length, 4);
});

test("일부 공개된 단어의 남은 한 글자만 열고 미공개 단어는 유지", () => {
  const q = fixture("마음을 사랑으로 하늘을");
  assert.deepEqual(matches(q, "을"), []);
  const revealed = matches(q, "마음이");
  assert.deepEqual(matches(q, "을", revealed), ["0:0:2"]);
  const love = matches(q, "사랑해");
  assert.deepEqual(matches(q, "으", love), ["0:2:2"]);
  assert.deepEqual(matches(q, "로", [...love, ...matches(q, "으", love)]), [
    "0:2:3",
  ]);
  assert.deepEqual(matches(q, "을", love), []);
});
