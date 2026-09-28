import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog } from "./catalog.ts";
import { sortDictionary } from "./data/english.ts";
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
  songTitleMatches,
  type Question,
} from "./game.ts";

// Rule tests use their own dictionary so editing the real data in the admin can't break them.
const dictionary = sortDictionary([
  { english: "City", pronunciation: "씨티", alternatives: ["시티"] },
  { english: "Piñata", pronunciation: "피나타", alternatives: [] },
  { english: "I'm", pronunciation: "암", alternatives: ["아임"] },
  {
    english: "90's love",
    pronunciation: "나인티스러브",
    alternatives: ["나인티스 러브"],
  },
]);
const fixture = (s: string): Question => ({
  id: "test",
  songId: "test",
  section: "",
  unit: "test",
  title: "test",
  lines: [tokenize(s, dictionary)],
});

// The tests below run against the bundled catalog, which is pulled from the DB
// right before each deploy, so they act as a data quality gate for publishing.
test("전체 활성 데이터와 원문 보존", () => {
  assert.ok(questions.length > 0);
  assert.equal(questions.length, catalog.questions.length);
  assert.equal(songs.length, catalog.songs.length);
  assert.deepEqual(units, [...new Set(catalog.songs.map((s) => s.artist))]);
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
test("괄호 제목과 영문 제목, 별칭 정답 인정", () => {
  const song = { title: "삐그덕 (Walk)", aliases: ["삐걱"] };
  assert.ok(songTitleMatches(song, "삐그덕"));
  assert.ok(songTitleMatches(song, "WALK"));
  assert.ok(songTitleMatches(song, "삐그덕(walk)"));
  assert.ok(songTitleMatches(song, "삐걱"));
  assert.ok(!songTitleMatches(song, "다른 노래"));
  assert.ok(!songTitleMatches(song, " "));
});
test("유닛 필터, 중복 문제와 동일 곡 연속 방지", () => {
  const unit = units.find(
    (u) =>
      new Set(questions.filter((q) => q.unit === u).map((q) => q.songId)).size >
      1,
  );
  if (!unit) return; // Needs a unit with at least two songs.
  const q = questions.find((q) => q.unit === unit)!;
  for (let i = 0; i < 50; i++) {
    const next = pickQuestion([unit], [q.id], q.id);
    assert.equal(next.unit, unit);
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
