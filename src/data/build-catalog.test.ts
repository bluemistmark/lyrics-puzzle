import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCatalog, type Rows } from "./build-catalog.ts";
import { scanLine, sortDictionary } from "./english.ts";

const rows = (): Rows => ({
  artists: [
    { name: "B", prefix: "B", sort_order: 1 },
    { name: "A", prefix: "A", sort_order: 0 },
  ],
  songs: [
    {
      id: "B_001",
      artist: "B",
      title: "Two",
      aliases: [" 둘 ", ""],
      sort_order: 1,
    },
    { id: "A_001", artist: "A", title: "One", aliases: [], sort_order: 0 },
    { id: "A_002", artist: "A", title: "Unused", aliases: [], sort_order: 2 },
  ],
  questions: [
    {
      id: "Q_2",
      song_id: "B_001",
      lines: ["너의 City", " 마음 ", ""],
      active: true,
    },
    { id: "Q_1", song_id: "A_001", lines: ["하나", "둘", "셋"], active: true },
    { id: "Q_3", song_id: "A_002", lines: ["안 나와", "숨김"], active: false },
  ],
  dictionary: [{ english: "city", pronunciation: "씨티", alternatives: [] }],
});

test("사용 문제만 게시하고, 문제 있는 곡만 sort_order 순으로 포함", () => {
  const { catalog, issues } = buildCatalog(rows());
  assert.deepEqual(issues, []);
  assert.deepEqual(
    catalog.songs.map((s) => s.id),
    ["A_001", "B_001"],
  );
  assert.deepEqual(catalog.songs[1].aliases, ["둘"]);
  assert.deepEqual(catalog.questions, [
    { id: "Q_1", songId: "A_001", lines: ["하나", "둘", "셋"] },
    { id: "Q_2", songId: "B_001", lines: ["너의 City", "마음"] },
  ]);
});

test("곡 순서는 가수 순서가 먼저 (게임의 유닛 표시 순서)", () => {
  const data = rows();
  data.artists = [
    { name: "B", prefix: "B", sort_order: 0 },
    { name: "A", prefix: "A", sort_order: 1 },
  ];
  assert.deepEqual(
    buildCatalog(data).catalog.songs.map((s) => s.id),
    ["B_001", "A_001"],
  );
});

test("가수 목록에 없는 가수, 잘못된·중복 접두어 검출", () => {
  const data = rows();
  data.artists.push({ name: "C", prefix: "A", sort_order: 2 });
  data.artists.push({ name: "D", prefix: "D-1", sort_order: 3 });
  data.songs[0].artist = "Z";
  const messages = buildCatalog(data).issues.map((i) => i.message);
  assert.ok(messages.includes("접두어 중복: A (A, C)"));
  assert.ok(messages.includes("가수 D: 접두어는 영문·숫자만 쓸 수 있어요"));
  assert.ok(messages.includes("곡 B_001: 가수 Z이(가) 가수 목록에 없음"));
});

test("사전에 없는 영어는 사용 중인 문제에서만 오류", () => {
  const data = rows();
  data.questions[0].lines[1] = "Hello 마음 Hello";
  data.questions[2].lines[1] = "Bye";
  const { issues } = buildCatalog(data);
  assert.deepEqual(
    issues.map((i) => [i.questionId, i.message]),
    [["Q_2", "문제 Q_2: 영어 발음 누락: Hello"]],
  );
});

test("필수값, 중복 ID, 없는 곡, 발음 충돌 검출", () => {
  const data = rows();
  data.songs.push({
    id: "A_003",
    artist: "A",
    title: "One",
    aliases: [],
    sort_order: 3,
  });
  data.questions.push({
    id: "Q_1",
    song_id: "Z_999",
    lines: ["가", ""],
    active: true,
  });
  data.dictionary.push({
    english: "CITY",
    pronunciation: "시티",
    alternatives: [],
  });
  const messages = buildCatalog(data).issues.map((i) => i.message);
  assert.ok(
    messages.some((m) => m.startsWith("같은 곡이 여러 ID로 등록됨: A/One")),
  );
  assert.ok(messages.includes("문제 Q_1: 문제ID 중복"));
  assert.ok(messages.includes("문제 Q_1: 곡 Z_999이(가) 없음"));
  assert.ok(messages.includes("문제 Q_1: 가사1·가사2는 필수"));
  assert.ok(messages.includes("영어 사전 발음 충돌: CITY"));
});

test("같은 발음의 중복 사전 항목은 대체발음을 합침", () => {
  const data = rows();
  data.dictionary.push({
    english: "City",
    pronunciation: "씨티",
    alternatives: ["시티"],
  });
  const { catalog, issues } = buildCatalog(data);
  assert.deepEqual(issues, []);
  assert.deepEqual(catalog.dictionary, [
    { english: "city", pronunciation: "씨티", alternatives: ["시티"] },
  ]);
});

test("사용 문제가 없으면 게시 불가", () => {
  const data = rows();
  for (const q of data.questions) q.active = false;
  assert.deepEqual(
    buildCatalog(data).issues.map((i) => i.message),
    ["출제 가능한 문제 없음"],
  );
});

test("긴 구절 우선, 붙은 라틴 문자는 매칭하지 않음", () => {
  const sorted = sortDictionary([
    { english: "love", pronunciation: "러브", alternatives: [] },
    { english: "90's love", pronunciation: "나인티스러브", alternatives: [] },
    { english: "I'm", pronunciation: "암", alternatives: [] },
  ]);
  const { tokens, missing } = scanLine("90’s LOVE, I’m lovely", sorted);
  assert.deepEqual(
    tokens.filter((t) => t.pronunciation).map((t) => t.text),
    ["90’s LOVE", "I’m"],
  );
  assert.deepEqual(missing, ["lovely"]);
});
