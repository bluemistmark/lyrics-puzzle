import { RotateCcw } from "lucide-react";
import { useGame, type Stats } from "../store";

const items: [string, keyof Stats][] = [
  ["제목 정답", "solved"],
  ["가사 완성", "completed"],
  ["현재 연속 정답", "streak"],
  ["최고 연속 정답", "best"],
  ["직접 완성", "direct"],
];

type Props = { hidden: boolean; onReset: () => void };

export function RecordPanel({ hidden, onReset }: Props) {
  const stats = useGame((s) => s.stats);
  return (
    <section
      id="record-panel"
      role="tabpanel"
      aria-labelledby="record-tab"
      hidden={hidden}
      className="record-panel"
    >
      <h1>나의 기록</h1>
      <div className="record-grid">
        {items.map(([label, key]) => (
          <div className="record-item" key={key}>
            <span>{label}</span>
            <strong>{stats[key]}문제</strong>
          </div>
        ))}
      </div>
      <p className="record-note">
        기록은 현재 브라우저에 저장돼요. 브라우저 데이터를 지우면 기록도
        삭제됩니다.
      </p>
      <button className="reset-btn" onClick={onReset}>
        <RotateCcw size={14} /> 기록 초기화
      </button>
    </section>
  );
}
