import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { calendarWeeks, playLevel } from "../calendar";
import { dailySummary, type DailySummary } from "../daily";
import { ACHIEVEMENTS, useGame, type Stats } from "../store";
import { useAccount } from "../account";
import { Achievements } from "./Achievements";

type Tile = [label: string, value: string];

const playTiles = (s: Stats): Tile[] => [
  ["가사 완성", `${s.completed}문제`],
  ["단어 공개 없이 완성", `${s.direct}문제`],
  ["현재 연속 정답", `${s.streak}문제`],
  ["최고 연속 정답", `${s.best}문제`],
];

const dailyTiles = (s: DailySummary): Tile[] => [
  ["참여", `${s.played}일`],
  ["정답률", `${s.played ? Math.round((s.solved / s.played) * 100) : 0}%`],
  ["정답까지 평균 입력", s.average === null ? "-" : `${s.average}단어`],
  ["최고 연속 정답", `${s.best}일`],
];

const GRASS_WEEKS = 16;

type View = "stats" | "achievements";
type Props = { hidden: boolean; onReset: () => void };

function Tiles({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="record-grid stat-tiles">
      {tiles.map(([label, value]) => (
        <div className="record-item stat-tile" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

export function RecordPanel({ hidden, onReset }: Props) {
  const [view, setView] = useState<View>("stats");
  const stats = useGame((s) => s.stats);
  const history = useGame((s) => s.dailyHistory);
  const today = useGame((s) => s.daily.date);
  const playLog = useGame((s) => s.playLog);
  const modeStats = useGame((s) => s.modeStats);
  const earned = useGame((s) => s.achievements);
  const signedIn = useAccount((s) => s.status === "signedIn");
  const daily = dailySummary(history, today);
  const days = calendarWeeks(today, GRASS_WEEKS).flat();
  const played = days.filter((d) => playLog[d.date]);
  const total = played.reduce((n, d) => n + playLog[d.date], 0);
  const achieved = ACHIEVEMENTS.filter((a) => earned[a.id]).length;
  return (
    <section
      id="record-panel"
      role="tabpanel"
      aria-labelledby="record-tab"
      hidden={hidden}
      className="record-panel"
    >
      <h1>나의 기록</h1>

      {/* The three numbers most players look for, each linking to its detail. */}
      <div className="record-item record-hero">
        <div>
          <span>제목 정답</span>
          <strong>{stats.solved}</strong>
        </div>
        <div>
          <span>오늘의 문제 연속</span>
          <strong>{daily.current}일</strong>
        </div>
        <button type="button" onClick={() => setView("achievements")}>
          <span>업적</span>
          <strong>
            {achieved}
            <small> / {ACHIEVEMENTS.length}</small>
          </strong>
        </button>
      </div>

      <div className="record-views" role="group" aria-label="기록 보기">
        {(
          [
            ["stats", "통계"],
            ["achievements", "업적"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className="filter"
            aria-pressed={view === key}
            onClick={() => setView(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "achievements" ? (
        <Achievements today={today} />
      ) : (
        <>
          <h2 className="record-subtitle">플레이</h2>
          <div className="record-grid">
            <div className="record-item play-grass">
              <span>
                최근 {GRASS_WEEKS}주 · {played.length}일 · {total}문제
              </span>
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
                      d.future
                        ? undefined
                        : `${d.date} ${playLog[d.date] ?? 0}문제`
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
          </div>
          <Tiles tiles={playTiles(stats)} />

          <h2 className="record-subtitle">오늘의 문제</h2>
          <Tiles tiles={dailyTiles(daily)} />

          <h2 className="record-subtitle">다른 모드</h2>
          <Tiles
            tiles={[
              ["심플 · 제목 정답", `${modeStats.simple.solved}문제`],
              ["이지 · 가사 완성", `${modeStats.easy.solved}문제`],
            ]}
          />

          <p className="record-note">
            {signedIn
              ? "기록은 계정에 저장돼 로그인한 다른 기기에서도 이어져요."
              : "기록은 현재 브라우저에 저장돼요. 브라우저 데이터를 지우면 기록도 삭제되니, 오른쪽 위 계정 메뉴에서 로그인하면 계정에 저장할 수 있어요."}{" "}
            플레이 기록·잔디·도감·업적은 클래식 모드만 반영해요. 오늘의 문제는
            하루를 건너뛰거나 포기하면 연속 정답이 끊겨요.
          </p>
          <button className="reset-btn" onClick={onReset}>
            <RotateCcw size={14} /> 기록 초기화
          </button>
        </>
      )}
    </section>
  );
}
