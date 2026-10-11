import { test } from "node:test";
import assert from "node:assert/strict";
import "../testing/fake-storage.ts";

const { useGame } = await import("../store.ts");
const { useRanking } = await import("../ranking.ts");
const { useDifficulty } = await import("../difficulty.ts");
const { koreaDate } = await import("../daily.ts");
const { mergeSaves } = await import("./save.ts");
const { applySnapshot, snapshot } = await import("./snapshot.ts");

test("계정 기록을 합쳐 적용하면 세 스토어에 들어가고 업적은 알림 없이 다시 계산됨", () => {
  useGame.getState().reset();
  useGame.setState({ justUnlocked: [] });
  useRanking.setState({ token: "device-token", nickname: "", asked: false });
  useDifficulty.setState({ votes: { q1: "easy" } });
  const local = snapshot();
  assert.equal(local.ranking.token, "device-token");
  assert.ok(local.resetAt > 0, "초기화 시각이 남음");

  const account = {
    ...local,
    resetAt: local.resetAt,
    stats: { ...local.stats, solved: 12 },
    collected: ["remote-q"],
    achievements: { "daily-first": "2026-09-01" },
    votes: { q2: "hard" as const },
    ranking: {
      token: "account-token",
      nickname: "시즈니",
      submitted: "",
      asked: true,
    },
  };
  applySnapshot(mergeSaves(local, account));

  const game = useGame.getState();
  assert.equal(game.stats.solved, 12);
  assert.deepEqual(game.collected, ["remote-q"]);
  assert.equal(game.achievements["daily-first"], "2026-09-01");
  // 12 titles reach "첫 정답"·"초성 탐정" on this device, quietly.
  assert.equal(game.achievements["solve-10"], koreaDate());
  assert.deepEqual(game.justUnlocked, []);
  assert.deepEqual(useDifficulty.getState().votes, { q1: "easy", q2: "hard" });
  assert.equal(useRanking.getState().token, "account-token");
  assert.equal(useRanking.getState().nickname, "시즈니");

  // Other test files share these stores in this process.
  useRanking.setState({ token: "", nickname: "", submitted: "", asked: false });
  useDifficulty.setState({ votes: {} });
  useGame.getState().reset();
});

/** `reset` keeps today's daily on purpose, so tests start it over themselves. */
const freshDaily = () => {
  useGame.getState().reset();
  const { daily } = useGame.getState();
  useGame.setState({
    dailyHistory: {},
    daily: {
      ...daily,
      round: { ...daily.round, solved: false, givenUp: false, words: [] },
    },
  });
};

test("다른 기기에서 푼 오늘 데일리는 이 기기에서도 푼 상태로 열림", () => {
  freshDaily();
  const local = snapshot();
  const daily = useGame.getState().daily;
  assert.equal(daily.round.solved, false);
  // The other device solved today's question and synced its round.
  const remote = {
    ...local,
    dailyHistory: { [daily.date]: { solved: true, guesses: 4, hints: 1 } },
    daily: {
      date: daily.date,
      round: {
        ...daily.round,
        solved: true,
        words: [{ word: "사랑", hit: true }],
      },
    },
  };
  applySnapshot(mergeSaves(local, remote));
  const after = useGame.getState().daily.round;
  assert.equal(after.solved, true);
  assert.deepEqual(after.words, [{ word: "사랑", hit: true }]);
  // Solving again here changes nothing.
  assert.equal(useGame.getState().solve("아무 제목", "daily"), false);
  // The store is shared with other test files; leave today's daily playable.
  freshDaily();
});

test("데일리 결과만 있는 예전 계정 기록도 오늘 데일리를 끝난 상태로 맞춤", () => {
  freshDaily();
  const local = snapshot();
  const date = useGame.getState().daily.date;
  const { daily: _daily, ...old } = {
    ...local,
    dailyHistory: { [date]: { solved: false, guesses: 9, hints: 3 } },
  };
  applySnapshot(mergeSaves({ ...local, daily: undefined }, old));
  const round = useGame.getState().daily.round;
  assert.equal(round.givenUp, true);
  assert.equal(round.solved, false);
  freshDaily();
});
