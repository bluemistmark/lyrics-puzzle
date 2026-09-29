import { shiftDate } from "./calendar.ts";
import { buildCollection } from "./collection.ts";
import { dailySummary, type DailyHistory } from "./daily.ts";
import type { Question, Song } from "./game.ts";
import { THEMES } from "./themes.ts";

// 업적. Judged from records the store already keeps plus a few counters (`Feats`);
// the store only remembers when each one was first reached, so ids must never change.

/** Counters kept only for achievements, updated when a title is guessed or given up. */
export type Feats = {
  /** Titles guessed with no word entered / at most one word entered. */
  noWord: number;
  oneWord: number;
  /** Titles of questions with English guessed without the English hint. */
  noEnglish: number;
  /** Titles guessed within `FAST_MS` of the question appearing. */
  fast: number;
  /** Titles guessed between 00:00 and 03:59 (Korea). */
  night: number;
  /** Current and best run of normal-mode titles from one unit. */
  unit: string;
  unitRun: number;
  unitBest: number;
};
export const emptyFeats = (): Feats => ({
  noWord: 0,
  oneWord: 0,
  noEnglish: 0,
  fast: 0,
  night: 0,
  unit: "",
  unitRun: 0,
  unitBest: 0,
});
export const FAST_MS = 30_000;

type SolveInfo = {
  mode: "play" | "daily";
  unit: string;
  words: number;
  hasEnglish: boolean;
  usedEnglishHint: boolean;
  /** When the question appeared; missing on rounds saved before 업적. */
  startedAt: number | undefined;
  now: number;
};
const koreaHour = (now: number) =>
  new Date(now + 9 * 60 * 60 * 1000).getUTCHours();

export function recordSolve(feats: Feats, info: SolveInfo): Feats {
  const next = { ...feats };
  if (info.words === 0) next.noWord++;
  if (info.words <= 1) next.oneWord++;
  if (info.hasEnglish && !info.usedEnglishHint) next.noEnglish++;
  if (info.startedAt !== undefined && info.now - info.startedAt <= FAST_MS)
    next.fast++;
  if (koreaHour(info.now) < 4) next.night++;
  if (info.mode === "play") {
    next.unitRun = feats.unit === info.unit ? feats.unitRun + 1 : 1;
    next.unit = info.unit;
    next.unitBest = Math.max(next.unitBest, next.unitRun);
  }
  return next;
}
/** Giving up a normal-mode question breaks the unit run. */
export const recordGiveUp = (feats: Feats): Feats => ({
  ...feats,
  unitRun: 0,
});

/** What achievements are judged on: a slice of the game store plus two facts from other stores. */
export type AchievementInput = {
  stats: {
    solved: number;
    completed: number;
    direct: number;
    best: number;
    skipped: number;
  };
  collected: readonly string[];
  dailyHistory: DailyHistory;
  playLog: Record<string, number>;
  feats: Feats;
  /** Theme choices the player has used. */
  themes: readonly string[];
  /** 체감 난이도 answers given. */
  votes: number;
  hasNickname: boolean;
  today: string;
};
export type AchievementIcon =
  | "trophy"
  | "flame"
  | "book"
  | "calendar"
  | "sparkles"
  | "zap"
  | "crown"
  | "moon"
  | "palette"
  | "star";
export const ACHIEVEMENT_GROUPS = [
  "정답",
  "가사",
  "데일리 퀴즈",
  "도감",
  "플레이",
  "숨은 업적",
] as const;
export type AchievementGroup = (typeof ACHIEVEMENT_GROUPS)[number];
export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: AchievementIcon;
  group: AchievementGroup;
  /** Title, condition and progress stay hidden until reached. */
  hidden: boolean;
  /** Reached when current >= goal. */
  progress: (input: AchievementInput) => { current: number; goal: number };
};

type Catalog = {
  songs: readonly Song[];
  questions: readonly Pick<Question, "id" | "songId">[];
};

/** Longest run of consecutive dates among `dates` (YYYY-MM-DD). */
function longestRun(dates: string[]) {
  const set = new Set(dates);
  let best = 0;
  for (const date of set) {
    if (set.has(shiftDate(date, -1))) continue;
    let run = 1;
    while (set.has(shiftDate(date, run))) run++;
    best = Math.max(best, run);
  }
  return best;
}

/** All achievements in display order (grouped); one "도감 완성" per unit in catalog order. */
export function achievementList({ songs, questions }: Catalog): Achievement[] {
  // Several achievements read the collection; rebuild it only when `collected` changes.
  let cache: {
    key: readonly string[];
    value: ReturnType<typeof buildCollection>;
  };
  const collection = (collected: readonly string[]) => {
    if (cache?.key !== collected)
      cache = {
        key: collected,
        value: buildCollection(songs, questions, collected),
      };
    return cache.value;
  };
  const units = collection([]);
  const totalSongs = units.reduce((n, u) => n + u.songs.length, 0);
  const songsCollected = (i: AchievementInput) =>
    collection(i.collected).reduce((n, u) => n + u.collected, 0);
  const daily = (i: AchievementInput) => dailySummary(i.dailyHistory, i.today);
  const busiest = (i: AchievementInput) =>
    Math.max(0, ...Object.values(i.playLog));

  const make =
    (group: AchievementGroup, hidden = false) =>
    (
      id: string,
      title: string,
      description: string,
      icon: AchievementIcon,
      goal: number,
      value: (input: AchievementInput) => number,
    ): Achievement => ({
      id,
      title,
      description,
      icon,
      group,
      hidden,
      progress: (input) => ({ current: Math.min(value(input), goal), goal }),
    });
  const solve = make("정답");
  const lyrics = make("가사");
  const day = make("데일리 퀴즈");
  const book = make("도감");
  const play = make("플레이");
  const secret = make("숨은 업적", true);

  return [
    solve(
      "first-solve",
      "첫 정답",
      "제목을 처음 맞혀요.",
      "trophy",
      1,
      (i) => i.stats.solved,
    ),
    solve(
      "solve-10",
      "초성 탐정",
      "제목을 10번 맞혀요.",
      "trophy",
      10,
      (i) => i.stats.solved,
    ),
    solve(
      "solve-50",
      "가사 박사",
      "제목을 50번 맞혀요.",
      "trophy",
      50,
      (i) => i.stats.solved,
    ),
    solve(
      "solve-100",
      "초성 마스터",
      "제목을 100번 맞혀요.",
      "crown",
      100,
      (i) => i.stats.solved,
    ),
    solve(
      "streak-5",
      "연속 5곡",
      "일반 모드에서 5곡 연속으로 맞혀요.",
      "flame",
      5,
      (i) => i.stats.best,
    ),
    solve(
      "streak-10",
      "멈출 수 없어",
      "일반 모드에서 10곡 연속으로 맞혀요.",
      "flame",
      10,
      (i) => i.stats.best,
    ),
    solve(
      "streak-20",
      "연속 20곡",
      "일반 모드에서 20곡 연속으로 맞혀요.",
      "flame",
      20,
      (i) => i.stats.best,
    ),
    solve(
      "no-word",
      "첫눈에 알아봤어",
      "단어를 하나도 입력하지 않고 제목을 맞혀요.",
      "star",
      1,
      (i) => i.feats.noWord,
    ),
    solve(
      "one-word",
      "한 단어면 충분해",
      "단어를 1개 이하로 입력하고 제목을 맞혀요.",
      "star",
      1,
      (i) => i.feats.oneWord,
    ),
    solve(
      "no-english",
      "영어는 몰라도",
      "영어가 섞인 문제를 영어 표시 없이 맞혀요.",
      "sparkles",
      1,
      (i) => i.feats.noEnglish,
    ),
    solve(
      "unit-run-10",
      "원픽",
      "같은 유닛 곡을 10곡 연속으로 맞혀요. (유닛을 하나만 고르면 쉬워요)",
      "flame",
      10,
      (i) => i.feats.unitBest,
    ),

    lyrics(
      "complete-1",
      "가사 완성",
      "가사를 처음으로 끝까지 복원해요.",
      "sparkles",
      1,
      (i) => i.stats.completed,
    ),
    lyrics(
      "complete-50",
      "가사 장인",
      "가사를 50번 끝까지 복원해요.",
      "sparkles",
      50,
      (i) => i.stats.completed,
    ),
    lyrics(
      "direct-10",
      "힌트는 필요 없어",
      "단어 공개 없이 가사를 10번 완성해요.",
      "zap",
      10,
      (i) => i.stats.direct,
    ),

    day(
      "daily-first",
      "오늘의 도전자",
      "데일리 퀴즈를 처음 끝내요.",
      "calendar",
      1,
      (i) => daily(i).played,
    ),
    day(
      "daily-streak-3",
      "3일 연속",
      "데일리 퀴즈를 3일 연속으로 맞혀요.",
      "calendar",
      3,
      (i) => daily(i).best,
    ),
    day(
      "daily-streak-7",
      "일주일 개근",
      "데일리 퀴즈를 7일 연속으로 맞혀요.",
      "calendar",
      7,
      (i) => daily(i).best,
    ),
    day(
      "daily-streak-30",
      "한 달 개근",
      "데일리 퀴즈를 30일 연속으로 맞혀요.",
      "calendar",
      30,
      (i) => daily(i).best,
    ),
    day(
      "daily-solved-30",
      "오늘의 단골",
      "데일리 퀴즈를 모두 30일 맞혀요. (연속이 아니어도 돼요)",
      "calendar",
      30,
      (i) => daily(i).solved,
    ),
    day(
      "daily-perfect",
      "완벽한 하루",
      "데일리 퀴즈를 힌트 없이 단어 3개 이하로 맞혀요.",
      "sparkles",
      1,
      (i) =>
        Object.values(i.dailyHistory).filter(
          (r) => r.solved && !r.hints && r.guesses <= 3,
        ).length,
    ),

    book(
      "full-song",
      "완곡",
      "구간이 여러 개인 곡의 모든 구간을 맞혀요.",
      "book",
      1,
      (i) =>
        collection(i.collected).some((u) =>
          u.songs.some((s) => s.total > 1 && s.solved === s.total),
        )
          ? 1
          : 0,
    ),
    book(
      "collect-half",
      "도감 절반",
      "전체 곡의 절반을 도감에 모아요.",
      "book",
      Math.ceil(totalSongs / 2),
      songsCollected,
    ),
    book(
      "collect-100",
      "도감 100곡",
      "도감에 100곡을 모아요.",
      "book",
      Math.min(100, totalSongs),
      songsCollected,
    ),
    ...units.map((unit) =>
      book(
        `collect-${unit.unit}`,
        `${unit.unit} 도감 완성`,
        `${unit.unit}의 모든 곡을 도감에 모아요.`,
        "book",
        unit.songs.length,
        (i) =>
          collection(i.collected).find((u) => u.unit === unit.unit)
            ?.collected ?? 0,
      ),
    ),
    book(
      "collect-all",
      "NCT 마스터",
      "모든 곡을 도감에 모아요.",
      "crown",
      totalSongs,
      songsCollected,
    ),

    play(
      "busy-day",
      "열정의 하루",
      "하루에 20문제를 끝내요.",
      "zap",
      20,
      busiest,
    ),
    play(
      "busy-day-50",
      "불태웠다",
      "하루에 50문제를 끝내요.",
      "zap",
      50,
      busiest,
    ),
    play(
      "play-days-7",
      "꾸준함",
      "7일 연속으로 일반 모드를 플레이해요.",
      "calendar",
      7,
      (i) => longestRun(Object.keys(i.playLog).filter((d) => i.playLog[d] > 0)),
    ),
    play(
      "votes-20",
      "성실한 평가단",
      "체감 난이도에 20번 응답해요.",
      "star",
      20,
      (i) => i.votes,
    ),
    play(
      "nickname",
      "랭커 데뷔",
      "데일리 랭킹에 닉네임을 등록해요.",
      "trophy",
      1,
      (i) => (i.hasNickname ? 1 : 0),
    ),

    secret(
      "give-up-10",
      "포기도 용기",
      "정답 보기를 10번 눌러요.",
      "moon",
      10,
      (i) => i.stats.skipped,
    ),
    secret(
      "fast",
      "번개",
      `문제가 나오고 ${FAST_MS / 1000}초 안에 제목을 맞혀요.`,
      "zap",
      1,
      (i) => i.feats.fast,
    ),
    secret(
      "night",
      "올빼미",
      "자정부터 새벽 4시 사이에 제목을 맞혀요.",
      "moon",
      1,
      (i) => i.feats.night,
    ),
    secret(
      "all-themes",
      "패셔니스타",
      "화면 테마를 모두 써 봐요.",
      "palette",
      THEMES.length,
      (i) => THEMES.filter(([id]) => i.themes.includes(id)).length,
    ),
  ];
}

/** Adds today's date for every newly reached achievement; earlier dates are kept. */
export function earnedAchievements(
  list: readonly Achievement[],
  input: AchievementInput,
  earned: Record<string, string>,
): Record<string, string> {
  const next = { ...earned };
  for (const a of list) {
    if (next[a.id]) continue;
    const { current, goal } = a.progress(input);
    if (current >= goal) next[a.id] = input.today;
  }
  return next;
}
