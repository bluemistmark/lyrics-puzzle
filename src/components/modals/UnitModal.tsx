import { Check, Headphones } from "lucide-react";
import { questions, songs, units } from "../../game";
import { useGame } from "../../store";

type Props = { onClose: () => void };

export function UnitModal({ onClose }: Props) {
  const selected = useGame((s) => s.selected);
  const select = useGame((s) => s.select);
  const all = selected.length === units.length;
  const toggle = (unit: string) =>
    select(
      selected.includes(unit)
        ? selected.filter((v) => v !== unit)
        : [...selected, unit],
    );
  return (
    <>
      <span className="modal-icon">
        <Headphones />
      </span>
      <h2>유닛 선택</h2>
      <p>
        여러 유닛을 선택할 수 있어요.
        <br />
        변경 사항은 다음 문제부터 적용돼요.
      </p>
      <div className="unit-options">
        <button
          aria-pressed={all}
          className={all ? "chosen" : ""}
          onClick={() => select(units)}
        >
          NCT 전체 {all && <Check size={16} />}
        </button>
        {units.map((u) => (
          <button
            key={u}
            aria-pressed={selected.includes(u)}
            className={selected.includes(u) ? "chosen" : ""}
            onClick={() => toggle(u)}
          >
            {u}
            {selected.includes(u) && <Check size={16} />}
          </button>
        ))}
      </div>
      <p className="sample-note">
        {songs.length}곡 · {questions.length}문제 중{" "}
        {questions.filter((q) => selected.includes(q.unit)).length}
        문제가 선택됐어요.
      </p>
      <button className="primary" onClick={onClose}>
        선택 완료
      </button>
    </>
  );
}
