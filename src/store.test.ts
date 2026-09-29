import { test } from "node:test";
import assert from "node:assert/strict";
import { questions, allKeys } from "./game.ts";
import { koreaDate } from "./daily.ts";
const memory = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => memory.set(k, v),
    removeItem: (k: string) => memory.delete(k),
  },
  configurable: true,
});
Object.defineProperty(globalThis, "window", {
  value: { localStorage: globalThis.localStorage },
  configurable: true,
});
const { useGame } = await import("./store.ts");

test("첫 문제를 아무 입력 전에 저장하고 재수화해도 유지", async () => {
  const firstId = useGame.getState().round.id;
  const saved = memory.get("chosung-lyrics-live-v1");
  assert.ok(saved);
  assert.equal(JSON.parse(saved!).state.round.id, firstId);
  await useGame.persist.rehydrate();
  assert.equal(useGame.getState().round.id, firstId);
});
test("제목 정답 후 가사 계속 풀기, 중복 집계 방지, 저장 복원, 포기", async () => {
  useGame.getState().reset();
  const q = questions.find((q) => q.id === useGame.getState().round.id)!;
  assert.ok(useGame.getState().solve(q.title));
  assert.equal(useGame.getState().stats.streak, 1);
  assert.equal(useGame.getState().solve(q.title), false);
  assert.equal(useGame.getState().stats.solved, 1);
  for (const line of q.lines)
    for (const t of line) useGame.getState().guess(t.text);
  assert.equal(useGame.getState().round.revealed.length, allKeys(q).length);
  assert.equal(useGame.getState().stats.completed, 1);
  assert.equal(useGame.getState().stats.direct, 1);
  await useGame.persist.rehydrate();
  assert.equal(useGame.getState().round.id, q.id);
  assert.equal(useGame.getState().stats.completed, 1);
  useGame.getState().next();
  assert.notEqual(useGame.getState().round.id, q.id);
  useGame.getState().giveUp();
  assert.equal(useGame.getState().stats.streak, 0);
  assert.equal(useGame.getState().stats.skipped, 1);
  useGame.getState().giveUp();
  assert.equal(useGame.getState().stats.skipped, 1);
});

test("공개 전 실패한 한 글자를 부분 공개 후 다시 입력 가능", () => {
  const q = questions.find((q) =>
    q.lines.some((line) =>
      line.some(
        (t) =>
          !t.pronunciation &&
          /^[가-힣]{3,}$/.test(t.text) &&
          !t.text.slice(0, -1).includes(t.text.at(-1)!),
      ),
    ),
  )!;
  const token = q.lines
    .flat()
    .find(
      (t) =>
        !t.pronunciation &&
        /^[가-힣]{3,}$/.test(t.text) &&
        !t.text.slice(0, -1).includes(t.text.at(-1)!),
    )!;
  useGame.getState().reset();
  useGame.setState({ round: { ...useGame.getState().round, id: q.id } });
  const suffix = token.text.at(-1)!;
  useGame.getState().guess(suffix);
  useGame.getState().guess(token.text.slice(0, -1));
  const before = useGame.getState().round.revealed.length;
  useGame.getState().guess(suffix);
  assert.ok(useGame.getState().round.revealed.length > before);
});

test("오늘의 도전은 일반 진행과 기록을 건드리지 않고 저장됨", async () => {
  useGame.getState().reset();
  const normalId = useGame.getState().round.id;
  const stats = { ...useGame.getState().stats };
  const today = koreaDate();
  useGame.getState().syncDaily(today);
  const dailyId = useGame.getState().daily.round.id;
  const question = questions.find((q) => q.id === dailyId)!;
  useGame.getState().guess(question.lines[0][0].text, "daily");
  assert.ok(useGame.getState().solve(question.title, "daily"));
  assert.equal(useGame.getState().round.id, normalId);
  assert.deepEqual(useGame.getState().stats, stats);
  await useGame.persist.rehydrate();
  assert.equal(useGame.getState().daily.round.id, dailyId);
  assert.equal(useGame.getState().daily.round.solved, true);
  const tomorrow = koreaDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
  useGame.getState().syncDaily(tomorrow);
  assert.equal(useGame.getState().daily.date, tomorrow);
  assert.equal(useGame.getState().daily.round.solved, false);
  assert.equal(useGame.getState().daily.round.words.length, 0);
});

test("가수명 힌트는 각 모드에서 한 번만 사용됨", () => {
  useGame.getState().reset();
  useGame.getState().hint("artist");
  assert.equal(useGame.getState().round.artist, true);
  assert.equal(useGame.getState().round.hints, 1);
  useGame.getState().hint("artist");
  assert.equal(useGame.getState().round.hints, 1);

  useGame.getState().syncDaily(koreaDate());
  useGame.getState().hint("artist", "daily");
  assert.equal(useGame.getState().daily.round.artist, true);
  assert.equal(useGame.getState().daily.round.hints, 1);
  assert.equal(useGame.getState().round.hints, 1);
});

test("제목을 맞힌 문제만 도감에 한 번씩 등록되고 초기화하면 비워짐", () => {
  useGame.getState().reset();
  useGame.getState().giveUp();
  assert.deepEqual(useGame.getState().collected, []);
  useGame.getState().next();
  const id = useGame.getState().round.id;
  const q = questions.find((q) => q.id === id)!;
  useGame.getState().solve("틀린 제목");
  assert.deepEqual(useGame.getState().collected, []);
  assert.ok(useGame.getState().solve(q.title));
  assert.deepEqual(useGame.getState().collected, [id]);

  const date = koreaDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
  useGame.getState().syncDaily(date);
  const daily = useGame.getState().daily.round.id;
  const dq = questions.find((q) => q.id === daily)!;
  assert.ok(useGame.getState().solve(dq.title, "daily"));
  assert.deepEqual(useGame.getState().collected, [...new Set([id, daily])]);

  useGame.getState().reset();
  assert.deepEqual(useGame.getState().collected, []);
});

test("도감 이전 저장값은 현재 맞힌 문제로 도감을 시작", async () => {
  useGame.getState().reset();
  useGame.getState().syncDaily(koreaDate());
  const q = questions.find((q) => q.id === useGame.getState().round.id)!;
  useGame.getState().solve(q.title);
  useGame.setState({ collected: [] });
  const saved = JSON.parse(memory.get("chosung-lyrics-live-v1")!);
  delete saved.state.collected;
  memory.set("chosung-lyrics-live-v1", JSON.stringify(saved));
  await useGame.persist.rehydrate();
  assert.deepEqual(useGame.getState().collected, [q.id]);
});

test("오늘의 문제는 처음 끝낸 결과만 날짜별로 기록되고 초기화해도 오늘 결과는 유지", () => {
  useGame.setState({ dailyHistory: {} });
  const date = koreaDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000));
  useGame.getState().syncDaily(date);
  const q = questions.find((q) => q.id === useGame.getState().daily.round.id)!;
  useGame.getState().guess("없는단어없는단어", "daily");
  useGame.getState().hint("artist", "daily");
  useGame.getState().giveUp();
  assert.deepEqual(useGame.getState().dailyHistory, {});
  assert.ok(useGame.getState().solve(q.title, "daily"));
  const recorded = { [date]: { solved: true, guesses: 1, hints: 1 } };
  assert.deepEqual(useGame.getState().dailyHistory, recorded);
  useGame.getState().guess("또없는단어", "daily");
  useGame.getState().giveUp("daily");
  assert.deepEqual(useGame.getState().dailyHistory, recorded);

  const next = koreaDate(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000));
  useGame.getState().syncDaily(next);
  useGame.getState().giveUp("daily");
  assert.deepEqual(useGame.getState().dailyHistory[next], {
    solved: false,
    guesses: 0,
    hints: 0,
  });
  useGame.getState().reset();
  assert.deepEqual(Object.keys(useGame.getState().dailyHistory), [next]);
  assert.deepEqual(useGame.getState().stats.solved, 0);
});

test("일반 모드에서 끝낸 문제만 오늘 날짜의 플레이 수로 세고 초기화하면 비워짐", () => {
  useGame.getState().reset();
  const today = koreaDate();
  const q = questions.find((q) => q.id === useGame.getState().round.id)!;
  useGame.getState().solve("틀린 제목");
  assert.deepEqual(useGame.getState().playLog, {});
  useGame.getState().solve(q.title);
  useGame.getState().giveUp();
  assert.deepEqual(useGame.getState().playLog, { [today]: 1 });
  useGame.getState().next();
  useGame.getState().giveUp();
  assert.deepEqual(useGame.getState().playLog, { [today]: 2 });

  useGame
    .getState()
    .syncDaily(koreaDate(new Date(Date.now() + 8 * 24 * 60 * 60 * 1000)));
  useGame.getState().giveUp("daily");
  assert.deepEqual(useGame.getState().playLog, { [today]: 2 });
  useGame.getState().reset();
  assert.deepEqual(useGame.getState().playLog, {});
});

test("업적은 달성 순간 한 번만 알림 목록에 오르고, 닫으면 비워지며 초기화하면 조용히 다시 계산", async () => {
  useGame.getState().reset();
  assert.deepEqual(useGame.getState().justUnlocked, []);
  const earnedBefore = { ...useGame.getState().achievements };
  const q = questions.find((q) => q.id === useGame.getState().round.id)!;
  useGame.getState().solve(q.title);
  const { achievements, justUnlocked } = useGame.getState();
  assert.equal(achievements["first-solve"], koreaDate());
  assert.ok(justUnlocked.includes("first-solve"));
  assert.ok(!justUnlocked.some((id) => earnedBefore[id]));

  useGame.getState().next();
  assert.equal(
    useGame.getState().justUnlocked.filter((id) => id === "first-solve").length,
    1,
  );
  useGame.getState().dismissUnlocked();
  assert.deepEqual(useGame.getState().justUnlocked, []);

  await useGame.persist.rehydrate();
  assert.equal(useGame.getState().achievements["first-solve"], koreaDate());
  assert.deepEqual(useGame.getState().justUnlocked, []);

  useGame.getState().reset();
  assert.equal(useGame.getState().achievements["first-solve"], undefined);
  assert.deepEqual(useGame.getState().justUnlocked, []);
});

test("정답 순간의 기록과 테마 사용을 업적용으로 남기고, 닉네임 등록 같은 다른 스토어 변화에도 업적을 다시 판정", async () => {
  // Other test files share the ranking store in this process.
  const { useRanking } = await import("./ranking.ts");
  useRanking.setState({ nickname: "" });
  useGame.getState().reset();
  const q = questions.find((q) => q.id === useGame.getState().round.id)!;
  useGame.getState().solve(q.title);
  const feats = useGame.getState().feats;
  assert.equal(feats.noWord, 1, "단어 입력 없이 맞힘");
  assert.equal(feats.unit, q.unit);
  assert.equal(feats.unitRun, 1);
  assert.ok(useGame.getState().achievements["no-word"]);
  useGame.getState().next();
  useGame.getState().giveUp();
  assert.equal(useGame.getState().feats.unitRun, 0);

  useGame.getState().noteTheme("dark");
  useGame.getState().noteTheme("dark");
  assert.deepEqual(
    useGame.getState().themes.filter((t) => t === "dark"),
    ["dark"],
  );

  assert.equal(useGame.getState().achievements.nickname, undefined);
  useRanking.setState({ nickname: "시즈니" });
  assert.equal(useGame.getState().achievements.nickname, koreaDate());
  assert.ok(useGame.getState().justUnlocked.includes("nickname"));
  useRanking.setState({ nickname: "" });

  useGame.getState().reset();
  assert.equal(useGame.getState().feats.noWord, 0);
  assert.ok(useGame.getState().themes.includes("dark"), "테마 기록은 유지");
});
