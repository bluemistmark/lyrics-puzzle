import { test } from "node:test";
import assert from "node:assert/strict";
import type { Catalog } from "./build-catalog.ts";
import {
  draftRelease,
  hasNews,
  NEWS_LIMIT,
  toNews,
  type ReleaseRow,
} from "./releases.ts";

const song = (id: string, title = id) => ({
  id,
  artist: "A",
  unit: "A",
  title,
  aliases: [],
});
const catalog = (songIds: string[], questionIds: string[]): Catalog => ({
  songs: songIds.map((id) => song(id)),
  questions: questionIds.map((id) => ({ id, songId: songIds[0], lines: [] })),
  dictionary: [],
});
const row = (id: number, draft: Partial<ReleaseRow> = {}): ReleaseRow => ({
  id,
  created_at: `2026-09-${String(id).padStart(2, "0")}T00:00:00Z`,
  features: [],
  note: "",
  added_songs: [],
  added_questions: 0,
  removed_questions: 0,
  song_ids: [],
  question_ids: [],
  ...draft,
});

test("첫 게시는 기준점: 새 곡·문제 없이 스냅샷만 기록", () => {
  const draft = draftRelease(catalog(["S1"], ["Q1", "Q2"]), undefined, "", "");
  assert.deepEqual(draft.added_songs, []);
  assert.equal(draft.added_questions, 0);
  assert.deepEqual(draft.question_ids, ["Q1", "Q2"]);
  assert.equal(hasNews(draft), false);
});

test("지난 게시와 비교해 새 곡, 새 문제, 빠진 문제 계산", () => {
  const previous = row(1, { song_ids: ["S1"], question_ids: ["Q1", "Q2"] });
  const draft = draftRelease(
    catalog(["S1", "S2"], ["Q2", "Q3", "Q4"]),
    previous,
    "",
    "",
  );
  assert.deepEqual(draft.added_songs, [{ id: "S2", title: "S2", artist: "A" }]);
  assert.equal(draft.added_questions, 2);
  assert.equal(draft.removed_questions, 1);
  assert.equal(hasNews(draft), true);
});

test("새 기능은 한 줄에 하나, 빈 줄과 앞뒤 공백 제거", () => {
  const previous = row(1, { song_ids: ["S1"], question_ids: ["Q1"] });
  const draft = draftRelease(
    catalog(["S1"], ["Q1"]),
    previous,
    "  소식 탭 추가 \n\n  대량 등록 ",
    "  메모  ",
  );
  assert.deepEqual(draft.features, ["소식 탭 추가", "대량 등록"]);
  assert.equal(draft.note, "메모");
  assert.equal(hasNews(draft), true);
});

test("소식은 최신순, 내용 없는 기준점 제외, 개수 제한", () => {
  const rows = [
    row(1),
    row(3, { note: "셋" }),
    row(2, {
      features: ["둘"],
      added_songs: [{ id: "S", title: "T", artist: "A" }],
    }),
  ];
  const news = toNews(rows);
  assert.deepEqual(
    news.map((n) => n.id),
    [3, 2],
  );
  assert.deepEqual(news[1].addedSongs, [{ title: "T", artist: "A" }]);
  const many = Array.from({ length: NEWS_LIMIT + 5 }, (_, i) =>
    row(i + 1, { note: "n" }),
  );
  assert.equal(toNews(many).length, NEWS_LIMIT);
  assert.equal(toNews(many)[0].id, NEWS_LIMIT + 5);
});
