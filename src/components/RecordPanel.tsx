import { RotateCcw } from "lucide-react";
import { calendarWeeks, playLevel } from "../calendar";
import { dailySummary, type DailySummary } from "../daily";
import { useGame, type Stats } from "../store";
import { Achievements } from "./Achievements";

const items: [string, keyof Stats][] = [
  ["제목 정답", "solved"],
  ["가사 완성", "completed"],
  ["현재 연속 정답", "streak"],
  ["최고 연속 정답", "best"],
  ["직접 완성", "direct"],
];

const dailyItems: [string, (s: DailySummary) => string][] = [
  ["참여", (s) => `${s.played}일`],
  [
    "정답률",
    (s) => `${s.played ? Math.round((s.solved / s.played) * 100) : 0}%`,
  ],
  [
    "정답까지 평균 입력",
    (s) => (s.average === null ? "-" : `${s.average}단어`),
  ],
  ["현재 연속 정답", (s) => `${s.current}일`],
  ["최고 연속 정답", (s) => `${s.best}일`],
];

const GRASS_WEEKS = 16;

type Props = { hidden: boolean; onReset: () => void };

export function RecordPanel({ hidden, onReset }: Props) {
  const stats = useGame((s) => s.stats);
  const history = useGame((s) => s.dailyHistory);
  const today = useGame((s) => s.daily.date);
  const playLog = useGame((s) => s.playLog);
  const daily = dailySummary(history, today);
  const days = calendarWeeks(today, GRASS_WEEKS).flat();
  const played = days.filter((d) => playLog[d.date]);
  const total = played.reduce((n, d) => n + playLog[d.date], 0);
  return (
    <section
      id="record-panel"
      role="tabpanel"
      aria-labelledby="record-tab"
      hidden={hidden}
      className="record-panel"
    >
      <h1>나의 기록</h1>
      <h2 className="record-subtitle">플레이</h2>
      <div className="record-grid">
        <div className="record-item play-grass">
          <span>최근 {GRASS_WEEKS}주</span>
          <div
            className="grass-grid"
            style={{ gridTemplateColumns: `repeat(${GRASS_WEEKS}, 1fr)` }}
            role="img"
            aria-label={`최근 ${GRASS_WEEKS}주 동안 ${played.length}일, ${total}문제 플레이`}
          >
            {days.map((d) => (
              <i
                key={d.date}
                className={`grass-cell level-${playLevel(playLog[d.date] ?? 0)}${d.future ? " future" : ""}${d.date === today ? " today" : ""}`}
                title={
                  d.future ? undefined : `${d.date} ${playLog[d.date] ?? 0}문제`
                }
              />
            ))}
          </div>
          <div className="grass-legend" aria-hidden="true">
            적음
            {[0, 1, 2, 3, 4].map((level) => (
              <i key={level} className={`grass-cell level-${level}`} />
            ))}
            많음
          </div>
        </div>
        {items.map(([label, key]) => (
          <div className="record-item" key={key}>
            <span>{label}</span>
            <strong>{stats[key]}문제</strong>
          </div>
        ))}
      </div>
      <h2 className="record-subtitle">오늘의 문제</h2>
      <div className="record-grid">
        {dailyItems.map(([label, value]) => (
          <div className="record-item" key={label}>
            <span>{label}</span>
            <strong>{value(daily)}</strong>
          </div>
        ))}
      </div>
      <Achievements today={today} />
      <p className="record-note">
        기록은 현재 브라우저에 저장돼요. 브라우저 데이터를 지우면 기록도
        삭제됩니다. 잔디는 일반 플레이에서 제목을 맞히거나 포기한 문제 수로
        진해지고, 오늘의 문제는 하루를 건너뛰거나 포기하면 연속 정답이 끊겨요.
      </p>
      <button className="reset-btn" onClick={onReset}>
        <RotateCcw size={14} /> 기록 초기화
      </button>
    </section>
  );
}
