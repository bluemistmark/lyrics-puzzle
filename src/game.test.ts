import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog } from "./catalog.ts";
import { sortDictionary } from "./data/english.ts";
import {
  guessCount,
  guessWeight,
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

test("괄호 안 여러 제목은 세미콜론으로 나누고, 버전·시각 설명은 제목으로 치지 않음", () => {
  const hero = { title: "영웅 (英雄; Kick It)", aliases: [] };
  assert.ok(songTitleMatches(hero, "Kick It"));
  assert.ok(songTitleMatches(hero, "英雄"));
  assert.ok(songTitleMatches(hero, "영웅"));
  const regular = { title: "Regular (Korean Ver.)", aliases: [] };
  assert.ok(songTitleMatches(regular, "Regular"));
  assert.ok(!songTitleMatches(regular, "Korean Ver."));
  const late = { title: "Back 2 U (AM 01:27)", aliases: [] };
  assert.ok(!songTitleMatches(late, "AM 01:27"));
  assert.ok(songTitleMatches(late, "Back 2 U"));
  // 닫는 괄호가 빠진 제목도 앞뒤를 나눠 인정한다.
  const typo = { title: "발자국 (Walk With You", aliases: [] };
  assert.ok(songTitleMatches(typo, "발자국"));
  assert.ok(songTitleMatches(typo, "Walk With You"));
});

test("괄호 안 부분이 다른 곡 제목이면 정답이 아니고, 별칭으로 등록하면 인정", () => {
  const other = (t: string) => t === "favorite";
  const song = { title: "Tangerine Love (Favorite)", aliases: [] };
  assert.ok(!songTitleMatches(song, "Favorite", other));
  assert.ok(songTitleMatches(song, "Tangerine Love", other));
  assert.ok(
    songTitleMatches({ ...song, aliases: ["Favorite"] }, "Favorite", other),
  );
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

test("아직 안 나온 문제 중에서 도감에 없는 문제를 먼저 고름", () => {
  const target = questions[0];
  const pool = questions.filter((q) => q.unit === target.unit);
  const others = pool.filter((q) => q.id !== target.id).map((q) => q.id);
  for (let i = 0; i < 20; i++)
    assert.equal(
      pickQuestion([target.unit], [], undefined, others).id,
      target.id,
    );
  // Everything collected: any unseen question is still fine.
  assert.ok(
    pickQuestion(
      [target.unit],
      [],
      undefined,
      pool.map((q) => q.id),
    ),
  );
});

test("여러 단어를 입력할 때 한 글자 단어도 함께 열림", () => {
  const q = fixture("숨어있는 숨 하나");
  // 한 글자 토큰 "숨"은 합친 입력("있는숨")만으로는 연속 두 글자 규칙에 걸려 열리지 않았다.
  assert.deepEqual(matches(q, "있는 숨").sort(), ["0:0:2", "0:0:3", "0:2:0"]);
  assert.deepEqual(matches(q, "숨"), ["0:2:0"]);
  assert.deepEqual(matches(q, "있는"), ["0:0:2", "0:0:3"]);
  // 한 글자 단어는 한 글자 입력과 같은 규칙: 토큰 전체가 그 글자일 때만 열린다.
  assert.deepEqual(matches(q, "하나 어"), matches(q, "하나"));
  // 공백 없는 입력은 그대로 연속 두 글자 이상만 인정한다.
  assert.deepEqual(matches(q, "있는숨"), ["0:0:2", "0:0:3"]);
});

test("여러 단어를 입력할 때 두 글자 이상 영어도 함께 열림", () => {
  const q = fixture("내 City 그리고 90's love 하나");
  // 영어는 전체 일치라서 합친 입력("city그리고")만으로는 열리지 않았다.
  assert.deepEqual(matches(q, "City 그리고").sort(), [
    "0:2:en",
    "0:4:0",
    "0:4:1",
    "0:4:2",
  ]);
  assert.deepEqual(matches(q, "시티 하나").sort(), [
    "0:2:en",
    "0:8:0",
    "0:8:1",
  ]);
  // 여러 단어로 된 사전 항목은 이어진 단어 묶음으로 맞힌다.
  assert.deepEqual(matches(q, "그리고 90's love").sort(), [
    "0:4:0",
    "0:4:1",
    "0:4:2",
    "0:6:en",
  ]);
  // 떨어진 단어를 이어 붙여 만든 묶음은 인정하지 않는다.
  assert.deepEqual(matches(q, "90's 하나 love").sort(), ["0:8:0", "0:8:1"]);
});

test("띄어 쓴 여러 단어를 한 번에 넣으면 단어 수만큼 입력으로 셈", () => {
  const words = (...list: string[]) =>
    list.map((word) => ({ word, hit: true }));
  assert.equal(guessCount([]), 0);
  assert.equal(guessCount(words("사랑")), 1);
  assert.equal(guessCount(words("너를 처음 본 순간", "  City  ")), 5);
});

test("붙여 써도 맞은 가사 단어 수만큼 입력으로 셈", () => {
  const q = fixture("너를 사랑해 정말 보고 싶어");
  const together = "너를사랑해정말보고싶어";
  const found = matches(q, together);
  // 붙여 쓴 한 번의 입력이 다섯 단어를 연다.
  assert.equal(new Set(found.map((k) => k.split(":")[1])).size, 5);
  assert.equal(guessWeight(together, found), 5);
  assert.equal(guessWeight("너를 사랑해", matches(q, "너를 사랑해")), 2);
  assert.equal(guessWeight("없는말", []), 1);
  // 저장된 값이 있으면 그 값을, 예전 기록은 띄어 쓴 단어 수를 쓴다.
  assert.equal(
    guessCount([
      { word: together, hit: true, count: 5 },
      { word: "예전 기록", hit: true },
    ]),
    7,
  );
});
